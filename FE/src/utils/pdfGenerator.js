import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";

const PDF_RENDER_CSS = `
  .docx-pdf-render {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .docx-pdf-render > section {
    background: transparent !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 2cm !important;
    min-height: auto !important;
  }

  .docx-pdf-render * {
    background-color: transparent !important;
  }
  
  .docx-pdf-render p {
    margin-bottom: 8pt !important;
  }
  
  .docx-pdf-render table {
    page-break-inside: avoid !important;
  }
  
  .docx-pdf-render tr {
    page-break-inside: avoid !important;
  }
`;

function forceWhiteBackgrounds(container) {
  const elements = container.querySelectorAll("*");
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const style = el.style;
    const bg = style.backgroundColor;
    if (bg && (bg.includes("229") || bg.includes("e5e5e5") || bg.includes("gray") || bg === "#e5e5e5" || bg === "rgb(229, 229, 229)")) {
      style.backgroundColor = "#ffffff";
    }
  }
}

export async function generatePdfFromDocxBlob(
  blob,
  filename
) {
  const arrayBuffer = await blob.arrayBuffer();

  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "-9999px";
  wrapper.style.height = "0px";
  wrapper.style.overflow = "hidden";

  const renderDiv = document.createElement("div");
  renderDiv.style.width = "794px";         
  renderDiv.style.background = "#ffffff";  
  renderDiv.style.color = "#000000";
  renderDiv.style.margin = "0";
  renderDiv.style.padding = "0";

  const styleEl = document.createElement("style");
  styleEl.textContent = PDF_RENDER_CSS;
  renderDiv.appendChild(styleEl);

  wrapper.appendChild(renderDiv);
  document.body.appendChild(wrapper);

  try {
    await renderAsync(arrayBuffer, renderDiv, undefined, {
      className: "docx-pdf-render",
      inWrapper: false,     
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      ignoreWidth: false,
      breakPages: false,     
    });

    await new Promise((r) => setTimeout(r, 1200));

    forceWhiteBackgrounds(renderDiv);

    wrapper.style.position = "absolute";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "-9999px";
    wrapper.style.height = "auto";
    wrapper.style.overflow = "visible";

    const pdfWorker = html2pdf()
      .set({
        margin: [12, -4, 12, -4],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
          scrollX: 0,
          scrollY: -window.scrollY,
          width: 794,
          windowWidth: 794,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: [
            "tr", "td", "th",
            "p", "li",
            "h1", "h2", "h3", "h4", "h5", "h6",
            "img", "figure", "blockquote",
            '[class*="docx-pdf-render-p"]',
            '[class*="docx-pdf-render-tblRow"]',
          ],
        },
      })
      .from(renderDiv);

    await pdfWorker.save();

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error("PDF generation failed. " + message);
  } finally {
    if (wrapper.parentNode) {
      document.body.removeChild(wrapper);
    }
  }
}
