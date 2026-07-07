import React from "react";

export function DocumentHeader({ title, rightContent }) {
    return (
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#F0F0F0]">
            <h1 className="text-[20px] font-bold text-[#111111] tracking-tight">{title}</h1>
            <div className="flex items-center gap-3">
                {rightContent}
            </div>
        </div>
    );
}
