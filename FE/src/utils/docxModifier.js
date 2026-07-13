import JSZip from "jszip";
import { resolveAnswerValue } from "./answerResolver";

export function collectFilledValues(containerEl) {
    const replacements = [];
    containerEl.querySelectorAll(".docx-fillable-wrapper").forEach((wrapper) => {
        const original = wrapper.dataset.originalText || "";
        const isFilled = wrapper.classList.contains("filled");
        if (!original)
            return;
        if (isFilled) {
            const display = wrapper.querySelector(".docx-fillable-display");
            const filledValue = display?.textContent || "";
            if (filledValue) {
                replacements.push({ original, value: filledValue });
            }
        }
        else {
            replacements.push({ original, value: "" });
        }
    });
    return replacements;
}
function escapeXml(unsafe) {
    if (!unsafe)
        return "";
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function replacePlaceholdersInXml(xml, replacements, ctx) {
    let nextAbsoluteIdx = ctx.globalIndex;
    const regex = /_{3,}|\[[^\]]+\]/g;
    return xml.replace(regex, (match) => {
        while (ctx.handledIndices.has(nextAbsoluteIdx)) {
            nextAbsoluteIdx++;
        }
        const currentIdx = nextAbsoluteIdx;
        nextAbsoluteIdx++;
        const replacement = replacements.find((r) => r.occurrenceIndex === currentIdx);
        if (replacement && replacement.value !== undefined) {
            return escapeXml(replacement.value);
        }
        return match;
    });
}

export function aggressiveNormalize(s) {
    let normalized = "";
    const posMap = [];
    const lower = s.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
        const char = lower[i];

        if (!/[a-z0-9_]/.test(char))
            continue;

        if (char === "_") {
            let count = 1;
            while (i + 1 < lower.length && lower[i + 1] === "_") {
                i++;
                count++;
            }
            normalized += "_";
            posMap.push(i - (count - 1));
            continue;
        }
        normalized += char;
        posMap.push(i);
    }
    return { normalized, posMap };
}

function searchNormalize(s) {
    return s.replace(/_{3,}/g, "_").replace(/\[[^\]]+\]/g, "[PH]").replace(/\s+/g, " ");
}

function decodeXmlEntities(s) {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#xA;/g, "\n")
        .replace(/&#x9;/g, "\t");
}
function getParagraphs(xml) {
    const paraRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
    const paragraphs = [];
    let paraMatch;
    while ((paraMatch = paraRegex.exec(xml)) !== null) {
        const pXml = paraMatch[0];
        let pText = "";
        const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
        let tMatch;
        while ((tMatch = tRegex.exec(pXml)) !== null) {
            pText += decodeXmlEntities(tMatch[1]);
        }
        paragraphs.push({
            start: paraMatch.index,
            end: paraMatch.index + paraMatch[0].length,
            fullMatch: pXml,
            textContent: pText,
        });
    }
    return paragraphs;
}
function getConcatenatedInfo(paragraphs) {
    let concatenated = "";
    const charToPara = [];
    for (let pi = 0; pi < paragraphs.length; pi++) {
        if (pi > 0) {
            charToPara.push({ paraIdx: -1, charIdx: -1, isNewline: true });
            concatenated += "\n";
        }
        const text = paragraphs[pi].textContent;
        for (let ci = 0; ci < text.length; ci++) {
            charToPara.push({ paraIdx: pi, charIdx: ci });
            concatenated += text[ci];
        }
    }
    return { concatenated, charToPara };
}
function findMatchesInRange(normalizedConcat, normalizedTarget) {
    const matches = [];
    let lastIdx = 0;
    while (true) {
        const idx = normalizedConcat.indexOf(normalizedTarget, lastIdx);
        if (idx === -1)
            break;
        matches.push({ start: idx, end: idx + normalizedTarget.length - 1 });
        lastIdx = idx + 1;
    }
    return matches;
}
function collectModificationTasks(xml, repeatingConfigs, clauseRemovals, answers, clauseCounters = {}, loopCounters = {}) {
    const paragraphs = getParagraphs(xml);
    const { concatenated, charToPara } = getConcatenatedInfo(paragraphs);
    const { normalized: normalizedConcat, posMap: concatIdxMap } = aggressiveNormalize(concatenated);
    const tasks = [];
    const addTasks = (matches, type, data) => {
        for (const m of matches) {
            const origStart = concatIdxMap[m.start];
            const origEnd = concatIdxMap[m.end];
            if (origStart === undefined || origEnd === undefined)
                continue;
            const pStart = charToPara[origStart].paraIdx;
            const pEnd = charToPara[origEnd].paraIdx;
            if (pStart === -1 || pEnd === -1)
                continue;
            const textBefore = concatenated.slice(0, origStart);
            const placeholdersBeforeCount = (textBefore.match(/_{3,}|\[[^\]]+\]/g) || []).length;
            const startParaText = paragraphs[pStart].textContent;
            const endParaText = paragraphs[pEnd].textContent;
            const startChar = charToPara[origStart].charIdx;
            const endChar = charToPara[origEnd].charIdx;

            const isFullStart = startParaText.slice(0, startChar).trim().length === 0;
            const isFullEnd = endParaText.slice(endChar + 1).trim().length === 0;
            const isFullParagraph = isFullStart && isFullEnd;
            tasks.push({
                type,
                startPara: pStart,
                endPara: pEnd,
                placeholdersBeforeCount,
                data: { ...data, isFullParagraph, startCharInPara: startChar, endCharInPara: endChar }
            });
        }
    };

    for (const config of repeatingConfigs) {
        const groupAnswer = answers[config.questionId];
        let baseVal = groupAnswer;
        if (typeof baseVal === "object" && baseVal !== null && "_value" in baseVal)
            baseVal = baseVal._value;
            
        let numEntries = 0;
        if (Array.isArray(baseVal)) {
            numEntries = baseVal.length;
        } else if (typeof baseVal === 'number' || (typeof baseVal === 'string' && !isNaN(Number(baseVal)) && baseVal.trim() !== '')) {
            numEntries = Number(baseVal);
        } else {
            numEntries = baseVal ? 1 : 0;
        }
        
        const { normalized: normTarget } = aggressiveNormalize(config.clauseText);
        let matches = findMatchesInRange(normalizedConcat, normTarget);
        if (config.occurrenceIndex !== undefined) {
            const configId = config._id || config.clauseName;
            const globalSeen = loopCounters[configId] || 0;
            const localMatchesCount = matches.length;
            
            const targetIdxLocal = config.occurrenceIndex - globalSeen;
            if (targetIdxLocal >= 0 && targetIdxLocal < localMatchesCount) {
                matches = [matches[targetIdxLocal]];
            } else {
                matches = [];
            }
            loopCounters[configId] = globalSeen + localMatchesCount;
        }
        addTasks(matches, 'loop', { config, numEntries });
    }

    for (const clause of clauseRemovals) {
        const { normalized: normTarget } = aggressiveNormalize(clause.text);
        let matches = findMatchesInRange(normalizedConcat, normTarget);

        if (matches.length === 0) {
            const lines = clause.text.split('\n').map(l => l.trim()).filter(l => l.length > 15);
            if (lines.length >= 2) {
                const { normalized: nFirst } = aggressiveNormalize(lines[0]);
                const { normalized: nLast } = aggressiveNormalize(lines[lines.length - 1]);
                const firstM = findMatchesInRange(normalizedConcat, nFirst);
                const lastM = findMatchesInRange(normalizedConcat, nLast);
                for (const fm of firstM) {
                    const lm = lastM.find(l => l.start > fm.end);
                    if (lm)
                        matches.push({ start: fm.start, end: lm.end });
                }
            }
        }
        if (clause.occurrenceIndex !== undefined) {
            const configId = clause._id || clause.clauseName || clause.text;
            const globalSeen = clauseCounters[configId] || 0;
            const localMatchesCount = matches.length;
            
            const targetIdxLocal = clause.occurrenceIndex - globalSeen;
            if (targetIdxLocal >= 0 && targetIdxLocal < localMatchesCount) {
                matches = [matches[targetIdxLocal]];
            } else {
                matches = [];
            }
            clauseCounters[configId] = globalSeen + localMatchesCount;
        }
        addTasks(matches, 'clause', clause);
    }
    return tasks.sort((a, b) => {
        if (a.startPara !== b.startPara) {
            return b.startPara - a.startPara;
        }
        if (a.type !== b.type) {
            return a.type === 'clause' ? -1 : 1;
        }
        const aStart = a.data?.startCharInPara || 0;
        const bStart = b.data?.startCharInPara || 0;
        return bStart - aStart;
    });
}

function removeTextFromParagraphRuns(xml, para, fromChar, toChar) {
    const pXml = para.fullMatch;
    const runRegex = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
    const runs = [];
    let runMatch;
    while ((runMatch = runRegex.exec(pXml)) !== null) {
        const textMatch = /<w:t[^>]*>([\s\S]*?)<\/w:t>/.exec(runMatch[0]);
        if (textMatch) {
            runs.push({
                localStart: runMatch.index,
                localEnd: runMatch.index + runMatch[0].length,
                fullMatch: runMatch[0],
                textContent: textMatch[1],
            });
        }
    }

    let charOffset = 0;
    let newPXml = pXml;
    let drift = 0;
    for (const run of runs) {
        const runTextStart = charOffset;
        const runTextEnd = charOffset + run.textContent.length - 1;
        charOffset += run.textContent.length;

        const overlapStart = Math.max(fromChar, runTextStart);
        const overlapEnd = Math.min(toChar, runTextEnd);
        if (overlapStart > overlapEnd)
            continue;
        const localFrom = overlapStart - runTextStart;
        const localTo = overlapEnd - runTextStart;
        const newText = run.textContent.slice(0, localFrom) + run.textContent.slice(localTo + 1);

        const newRunXml = run.fullMatch.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/, `<w:t xml:space="preserve">${escapeXml(newText)}</w:t>`);
        const absStart = run.localStart + drift;
        const absEnd = run.localEnd + drift;
        newPXml = newPXml.slice(0, absStart) + newRunXml + newPXml.slice(absEnd);
        drift += newRunXml.length - run.fullMatch.length;
    }
    return xml.slice(0, para.start) + newPXml + xml.slice(para.end);
}
function applyLoopTask(xml, task, replacements, answers, ctx) {
    const paragraphs = getParagraphs(xml);
    const para = paragraphs[task.startPara];
    const endPara = paragraphs[task.endPara];
    if (!para || !endPara)
        return xml;
    const { numEntries } = task.data;
    const blockXml = xml.slice(para.start, endPara.end);
    const blockPlaceholders = blockXml.match(/_{3,}|\[[^\]]+\]/g) || [];
    if (numEntries === 0) {
        xml = xml.slice(0, para.start) + xml.slice(endPara.end);
    }
    else {
        let repeatedXml = "";
        for (let i = 0; i < numEntries; i++) {
            let iterationXml = blockXml;
            let pIdx = 0;
            iterationXml = iterationXml.replace(/_{3,}|\[[^\]]+\]/g, (match) => {
                const currentPlaceholderGlobalIdx = ctx.globalIndex + task.placeholdersBeforeCount + pIdx;
                const mapping = replacements.find(r => r.occurrenceIndex === currentPlaceholderGlobalIdx);
                pIdx++;
                if (mapping) {
                    const val = resolveAnswerValue(answers, mapping.questionId, undefined, i);
                    return escapeXml(val);
                }

                return `__UNMAPPED_LOOP_PH_${pIdx}__`;
            });
            repeatedXml += iterationXml;
        }
        xml = xml.slice(0, para.start) + repeatedXml + xml.slice(endPara.end);
    }
    for (let j = 0; j < blockPlaceholders.length; j++) {
        ctx.handledIndices.add(ctx.globalIndex + task.placeholdersBeforeCount + j);
    }
    return xml;
}
function applyClauseTask(xml, task, ctx) {
    const paragraphs = getParagraphs(xml);
    const para = paragraphs[task.startPara];
    const endPara = paragraphs[task.endPara];
    if (!para || !endPara)
        return xml;
    const { isFullParagraph, startCharInPara, endCharInPara } = task.data;
    let removedPlaceholdersOffset = 0;
    let removedPlaceholdersCount = 0;

    if (isFullParagraph) {
        const blockXml = xml.slice(para.start, endPara.end);
        removedPlaceholdersCount = (blockXml.match(/_{3,}|\[[^\]]+\]/g) || []).length;
    } else {
        if (task.startPara === task.endPara) {
            const startParaText = para.textContent;
            const textBeforeRemoval = startParaText.slice(0, startCharInPara);
            const removedText = startParaText.slice(startCharInPara, endCharInPara + 1);
            
            removedPlaceholdersOffset = (textBeforeRemoval.match(/_{3,}|\[[^\]]+\]/g) || []).length;
            removedPlaceholdersCount = (removedText.match(/_{3,}|\[[^\]]+\]/g) || []).length;
        } else {
            const startParaText = para.textContent;
            const endParaText = endPara.textContent;
            const textBeforeRemoval = startParaText.slice(0, startCharInPara);
            
            let removedText = startParaText.slice(startCharInPara) + "\n";
            for (let i = task.startPara + 1; i < task.endPara; i++) {
                removedText += paragraphs[i].textContent + "\n";
            }
            removedText += endParaText.slice(0, endCharInPara + 1);

            removedPlaceholdersOffset = (textBeforeRemoval.match(/_{3,}|\[[^\]]+\]/g) || []).length;
            removedPlaceholdersCount = (removedText.match(/_{3,}|\[[^\]]+\]/g) || []).length;
        }
    }

    for (let j = 0; j < removedPlaceholdersCount; j++) {
        ctx.handledIndices.add(ctx.globalIndex + task.placeholdersBeforeCount + removedPlaceholdersOffset + j);
    }
    if (isFullParagraph) {
        return xml.slice(0, para.start) + xml.slice(endPara.end);
    }
    else {
        if (task.startPara === task.endPara) {
            return removeTextFromParagraphRuns(xml, para, startCharInPara, endCharInPara);
        }
        else {
            let currentXml = xml.slice(0, paragraphs[task.startPara + 1].start) + xml.slice(paragraphs[task.endPara].start);
            const updatedParas = getParagraphs(currentXml);
            const startNew = updatedParas[task.startPara];
            const endNew = updatedParas[task.startPara + 1];
            currentXml = removeTextFromParagraphRuns(currentXml, endNew, 0, endCharInPara);
            currentXml = removeTextFromParagraphRuns(currentXml, startNew, startCharInPara, startNew.textContent.length - 1);
            return currentXml;
        }
    }
}
function applyModificationTasks(xml, tasks, replacements, answers, ctx) {
    const deletedParas = new Set();
    for (const task of tasks) {
        if (deletedParas.has(task.startPara)) continue;
        
        if (task.type === 'loop') {
            xml = applyLoopTask(xml, task, replacements, answers, ctx);
        }
        else {
            const oldLength = xml.length;
            xml = applyClauseTask(xml, task, ctx);
            if (task.data.isFullParagraph && xml.length < oldLength) {
                deletedParas.add(task.startPara);
            }
        }
    }
    return xml;
}

function resolveDocxFooterAnswer(val) {
    if (val === null || val === undefined)
        return "";
    if (typeof val === "string")
        return val;
    if (typeof val === "boolean")
        return val ? "Yes" : "No";
    if (val instanceof Date)
        return val.toLocaleDateString();
    if (Array.isArray(val)) {
        return val
            .map((row) => {
            if (typeof row === "object" && row !== null) {
                return Object.values(row).filter(Boolean).join(", ");
            }
            return String(row);
        })
            .filter(Boolean)
            .join("; ");
    }
    if (typeof val === "object") {
        if ("_textInput" in val && val._textInput)
            return String(val._textInput);
        if ("_value" in val && val._value)
            return String(val._value);
        const parts = Object.values(val).filter(Boolean);
        if (parts.length)
            return parts.map(String).join(", ");
    }
    return String(val);
}

function resolveDocxFooterText(template, answers) {
    return template
        .replace(/\{\{page_number\}\}/g, "")
        .replace(/\{\{page_count\}\}/g, "")
        .replace(/\{\{sys\.formFilledDate\}\}/g, () => {
        const now = new Date();
        return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
    })
        .replace(/\{\{sys\.currentYear\}\}/g, String(new Date().getFullYear()))
        .replace(/\{\{sys\.userName\}\}/g, () => resolveDocxFooterAnswer(answers["sys.userName"]))
        .replace(/\{\{sys\.userEmail\}\}/g, () => resolveDocxFooterAnswer(answers["sys.userEmail"]))
        .replace(/\{\{([^}]+)\}\}/g, (_match, key) => resolveDocxFooterAnswer(answers[key]));
}
function hasPageToken(template) {
    return /\{\{page_number\}\}|\{\{page_count\}\}/.test(template);
}
function buildRpr(fontSizePt) {
    const halfPts = Math.round(fontSizePt * 2);
    return `<w:rPr><w:sz w:val="${halfPts}"/><w:szCs w:val="${halfPts}"/><w:color w:val="888888"/></w:rPr>`;
}
function buildTextRun(text, fontSizePt) {
    if (!text)
        return "";
    return `<w:r>${buildRpr(fontSizePt)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}
function buildPageFieldRuns(rPr) {
    return (`<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
        `<w:r>${rPr}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
        `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>` +
        `<w:r>${rPr}<w:t xml:space="preserve"> of </w:t></w:r>` +
        `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
        `<w:r>${rPr}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>` +
        `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`);
}

function buildLineRuns(rawTemplate, answers, fontSizePt, addPageNumber) {
    const rPr = buildRpr(fontSizePt);
    let runs = "";

    const tokenRegex = /\{\{(page_number|page_count|[^}]+)\}\}/g;
    let lastIdx = 0;
    let m;
    while ((m = tokenRegex.exec(rawTemplate)) !== null) {
        if (m.index > lastIdx) {
            const staticText = resolveDocxFooterText(rawTemplate.slice(lastIdx, m.index), answers);
            if (staticText)
                runs += buildTextRun(staticText, fontSizePt);
        }
        if (m[1] === "page_number") {
            runs += (`<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
                `<w:r>${rPr}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
                `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`);
        }
        else if (m[1] === "page_count") {
            runs += (`<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
                `<w:r>${rPr}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>` +
                `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`);
        }
        else {

            const resolved = resolveDocxFooterAnswer(answers[m[1]]);
            if (resolved)
                runs += buildTextRun(resolved, fontSizePt);
        }
        lastIdx = m.index + m[0].length;
    }

    if (lastIdx < rawTemplate.length) {
        const trailing = resolveDocxFooterText(rawTemplate.slice(lastIdx), answers);
        if (trailing)
            runs += buildTextRun(trailing, fontSizePt);
    }

    if (addPageNumber && !hasPageToken(rawTemplate)) {
        if (runs)
            runs += buildTextRun("   ", fontSizePt);
        runs += buildPageFieldRuns(rPr);
    }
    return runs;
}
function buildFooterParagraph(runs, alignment, fontSizePt) {
    const halfPts = Math.round(fontSizePt * 2);
    const jcVal = alignment === "right" ? "right" : alignment === "left" ? "left" : "center";
    return (`<w:p>` +
        `<w:pPr>` +
        `<w:jc w:val="${jcVal}"/>` +
        `<w:rPr><w:sz w:val="${halfPts}"/><w:szCs w:val="${halfPts}"/><w:color w:val="888888"/></w:rPr>` +
        `</w:pPr>` +
        runs +
        `</w:p>`);
}
function buildFooterXml(footerConfig, answers) {
    const fontSize = footerConfig.fontSize ?? 9;
    const rPr = buildRpr(fontSize);
    const paragraphs = [];

    const line1Runs = buildLineRuns(footerConfig.line1.content, answers, fontSize, footerConfig.showPageNumbers && footerConfig.pageNumberPlacement === "line1");
    if (line1Runs) {
        paragraphs.push(buildFooterParagraph(line1Runs, footerConfig.line1.alignment, fontSize));
    }

    const line2Runs = buildLineRuns(footerConfig.line2.content, answers, fontSize, footerConfig.showPageNumbers && footerConfig.pageNumberPlacement === "line2");
    if (line2Runs) {
        paragraphs.push(buildFooterParagraph(line2Runs, footerConfig.line2.alignment, fontSize));
    }

    if (footerConfig.showPageNumbers && footerConfig.pageNumberPlacement === "separate") {
        paragraphs.push(buildFooterParagraph(buildPageFieldRuns(rPr), "right", fontSize));
    }
    if (paragraphs.length === 0)
        return "";
    const nsDecl = [
        `xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"`,
        `xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"`,
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,
        `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`,
        `xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"`,
        `mc:Ignorable="w14"`,
    ].join(" ");
    return (`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:ftr ${nsDecl}>` +
        paragraphs.join("") +
        `</w:ftr>`);
}
const FOOTER_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
const FOOTER_REL_ID = "rIdFooterCustom1";
const FOOTER_FILE_NAME = "footer_custom1.xml";
const FOOTER_PART_PATH = `word/${FOOTER_FILE_NAME}`;
const FOOTER_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";
async function injectFooterIntoDocx(zip, footerConfig, answers) {
    const footerXml = buildFooterXml(footerConfig, answers);
    if (!footerXml)
        return;

    zip.file(FOOTER_PART_PATH, footerXml);

    const relsPath = "word/_rels/document.xml.rels";
    const relsFile = zip.file(relsPath);
    let relsXml = relsFile
        ? await relsFile.async("string")
        : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    relsXml = relsXml.replace(new RegExp(`<Relationship[^/]*Id="${FOOTER_REL_ID}"[^/]*/>`, "g"), "");
    const newRel = `<Relationship Id="${FOOTER_REL_ID}" Type="${FOOTER_REL_TYPE}" Target="${FOOTER_FILE_NAME}"/>`;
    relsXml = relsXml.replace(/<\/Relationships>/, `${newRel}</Relationships>`);
    zip.file(relsPath, relsXml);

    const ctPath = "[Content_Types].xml";
    const ctFile = zip.file(ctPath);
    if (ctFile) {
        let ctXml = await ctFile.async("string");
        ctXml = ctXml.replace(new RegExp(`<Override PartName="/${FOOTER_PART_PATH}"[^/]*/>`, "g"), "");
        const newOverride = `<Override PartName="/${FOOTER_PART_PATH}" ContentType="${FOOTER_CONTENT_TYPE}"/>`;
        ctXml = ctXml.replace(/<\/Types>/, `${newOverride}</Types>`);
        zip.file(ctPath, ctXml);
    }

    const docFile = zip.file("word/document.xml");
    if (docFile) {
        let docXml = await docFile.async("string");

        docXml = docXml.replace(new RegExp(`<w:footerReference[^/]*r:id="${FOOTER_REL_ID}"[^/]*/>`, "g"), "");
        const refDefault = `<w:footerReference w:type="default" r:id="${FOOTER_REL_ID}"/>`;
        const refFirst = `<w:footerReference w:type="first" r:id="${FOOTER_REL_ID}"/>`;
        const refEven = `<w:footerReference w:type="even" r:id="${FOOTER_REL_ID}"/>`;
        const allRefs = refDefault + refFirst + refEven;
        if (/<w:sectPr[\s>]/.test(docXml)) {
            docXml = docXml.replace(/(<w:sectPr[^>]*>)/, `$1${allRefs}`);
        }
        else {
            docXml = docXml.replace(/<\/w:body>/, `<w:sectPr>${allRefs}</w:sectPr></w:body>`);
        }
        zip.file("word/document.xml", docXml);
    }
}

export async function createFilledDocx(originalArrayBuffer, replacements, clauseRemovals = [], repeatingConfigs = [], answers = {}, footerConfig) {
    const zip = await JSZip.loadAsync(originalArrayBuffer);
    const xmlFiles = Object.keys(zip.files).filter((name) => name.startsWith("word/") &&
        name.endsWith(".xml") &&
        !name.endsWith(".xml.rels"));

    const sortedFiles = xmlFiles.sort((a, b) => {
        const order = (name) => {
            if (name.includes("header"))
                return 1;
            if (name.includes("document"))
                return 2;
            if (name.includes("footer"))
                return 3;
            return 4;
        };
        const orderA = order(a);
        const orderB = order(b);
        if (orderA !== orderB)
            return orderA - orderB;
        return a.localeCompare(b); 
    });
    
    let globalIndex = 0;
    const ctx = { globalIndex, handledIndices: new Set() };
    const clauseCounters = {};
    const loopCounters = {};

    for (const fileName of sortedFiles) {
        const file = zip.file(fileName);
        if (!file)
            continue;
        let xml = await file.async("string");
        const placeholdersInFile = (xml.match(/_{3,}|\[[^\]]+\]/g) || []).length;

        const tasks = collectModificationTasks(xml, repeatingConfigs, clauseRemovals, answers, clauseCounters, loopCounters);

        xml = applyModificationTasks(xml, tasks, replacements, answers, ctx);

        xml = replacePlaceholdersInXml(xml, replacements, ctx);

        ctx.globalIndex = ctx.globalIndex + placeholdersInFile;

        const restoreTokens = (xml) => {
            return xml.replace(/__UNMAPPED_LOOP_PH_\d+__/g, "______________________________");
        };
        xml = restoreTokens(xml);

        if (fileName !== FOOTER_PART_PATH) {
            zip.file(fileName, xml);
        }
    }

    if (footerConfig?.enabled) {
        await injectFooterIntoDocx(zip, footerConfig, answers);
    }
    return await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}
