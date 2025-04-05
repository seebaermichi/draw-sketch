export const toolButtons = {
    tools: [
        {
            label: "freehand",
            emoji: "✏️",
            action: "setTool",
            class: "bg-yellow-100 border-yellow-300 text-yellow-900",
            activeClass: "bg-yellow-300 border-yellow-500",
        },
        {
            label: "line",
            emoji: "➖",
            action: "setTool",
            class: "bg-green-100 border-green-300 text-green-900",
            activeClass: "bg-green-300 border-green-500",
        },
        {
            label: "rectangle",
            emoji: "▭",
            action: "setTool",
            class: "bg-blue-100 border-blue-300 text-blue-900",
            activeClass: "bg-blue-300 border-blue-500",
        },
        {
            label: "circle",
            emoji: "⭕",
            action: "setTool",
            class: "bg-purple-100 border-purple-300 text-purple-900",
            activeClass: "bg-purple-300 border-purple-500",
        },
        {
            label: "label",
            emoji: "🏷️",
            action: "setTool",
            class: "bg-pink-100 border-pink-300 text-pink-900",
            activeClass: "bg-pink-300 border-pink-500",
        },
    ],
    actions: [
        {
            label: "undo",
            emoji: "↩️",
            action: "undo",
            class: "bg-stone-200 border-stone-400 text-stone-900",
        },
        {
            label: "redo",
            emoji: "↪️",
            action: "redo",
            class: "bg-stone-200 border-stone-400 text-stone-900",
        },
        {
            label: "delete",
            emoji: "🗑️",
            action: "deleteSelected",
            class: "bg-red-100 border-red-300 text-red-900",
        },
        {
            label: "clear",
            emoji: "🧹",
            action: "clearCanvas",
            class: "bg-red-200 border-red-400 text-red-900",
        },
        {
            label: "save",
            emoji: "💾",
            action: "saveCanvas",
            class: "bg-green-200 border-green-400 text-green-900",
        },
    ],
};
