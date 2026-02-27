const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const button = document.getElementById("save-button");
const themeToggle = document.getElementById("theme-toggle");

const noteMenu = document.getElementById("note-menu");
const fontSizeSelect = document.getElementById("font-size-select");
const bgColorSelect = document.getElementById("bg-color-select");
const bringToFrontBtn = document.getElementById("bring-to-front");
const sendToBackBtn = document.getElementById("send-to-back");


let activeTextarea = null;
let editingNote = null;

let clipboardNote = null;
let notes = [];
let offsetX = 0;
let offsetY = 0;
let scale = 1;

let selectedNote = null;
let draggingNote = null;
let resizingNote = null;
let isPanning = false;

let startX, startY;

// Saving/Loading


async function loadNotes() {
    const response = await fetch("/api/notes");
    const data = await response.json();

    notes = data.notes || [];

    if (data.viewport) {
        scale = data.viewport.scale ?? 1;
        offsetX = data.viewport.offsetX ?? 0;
        offsetY = data.viewport.offsetY ?? 0;
    }

    if (data.theme) {
        document.body.setAttribute("data-theme", data.theme);
    }
    draw();
}

async function saveNotes() {
    const appState = {
        notes: notes,
        viewport: {
            scale: scale,
            offsetX: offsetX,
            offsetY: offsetY
        },
        theme: document.body.getAttribute("data-theme") || "light"
    };

    await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appState)
    });
}

// Maybe will add this later
// let saveTimeout;

// function scheduleSave() {
//     clearTimeout(saveTimeout);
//     saveTimeout = setTimeout(() => {
//         saveNotes();
//     }, 300);
// }



// Helper function, utilities


//Fixes live resize while developer tools open
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}

window.addEventListener("resize", resizeCanvas);


function screenToWorld(x, y) {
    return {
        x: (x - offsetX) / scale,
        y: (y - offsetY) / scale
    };
}


function getNoteAt(x, y) {
    for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        if (x >= n.x && x <= n.x + n.width &&
            y >= n.y && y <= n.y + n.height) {
            return n;
        }
    }
    return null;
}


function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let currentLine = "";

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === "\n") {
            lines.push(currentLine);
            currentLine = "";
            continue;
        }

        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== "") {
            lines.push(currentLine);
            currentLine = char;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine !== "") {
        lines.push(currentLine);
    }

    return lines;
}

function applyEditorTheme(textarea, note) {
    const isDark = document.body.getAttribute("data-theme") === "dark";

    if (!note) return;

    let bg = note.bgColor || "#fff8a6";

    if (isDark) {
        // simulate multiply overlay like canvas
        textarea.style.backgroundColor = darkenColor(bg, 0.6);
        textarea.style.color = "#ffffff";
    } else {
        textarea.style.backgroundColor = bg;
        textarea.style.color = "#000000"; //I would assume this color needs to change
    }
}

function darkenColor(hex, amount) {
    const num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.floor(r * (1 - amount));
    g = Math.floor(g * (1 - amount));
    b = Math.floor(b * (1 - amount));

    return `rgb(${r}, ${g}, ${b})`;
}

function getRenderedNoteColor(note) {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    const base = note.bgColor || "#fff8a6";

    if (!isDark) return base;

    // Magic number for the win, #0.35 becomes empirically correct number, 
    // there is an argument to be made for 0.34, 
    // but that is for another discussion
    return darkenColor(base, 0.35);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawSingleNote(note, isDark) {

    ctx.fillStyle = getRenderedNoteColor(note);
    // ctx.fillRect(note.x, note.y, note.width, note.height);
    drawRoundedRect(ctx, note.x, note.y, note.width, note.height, 16);
ctx.fill();

    if (isDark) {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.60;
        ctx.fillStyle = "#595656";
        drawRoundedRect(ctx, note.x, note.y, note.width, note.height, 16);
ctx.fill();
        ctx.restore();
    }

    // Text
    ctx.fillStyle = isDark ? "#fff" : "#111";
    ctx.font = (note.fontSize || 16) + "px Arial";

    const padding = 10;
    const maxWidth = note.width - padding * 2;
    const lineHeight = (note.fontSize || 16) * 1.3;

    const lines = wrapText(ctx, note.fullText, maxWidth);
    const maxLines = Math.floor(note.height / lineHeight);
    const visibleLines = lines.slice(0, maxLines);
    const textHeight = visibleLines.length * lineHeight;

    let textY = note.y + (note.height - textHeight) / 2 + lineHeight / 2;

    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, note.x, note.y, note.width, note.height, 16);
    ctx.clip();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    visibleLines.forEach(line => {
        ctx.fillText(
            line.trim(),
            note.x + note.width / 2,
            textY
        );
        textY += lineHeight;
    });

    ctx.restore();

    // Resize border
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.50; // Transparency of resize border
    ctx.lineWidth = 2;
    ctx.strokeStyle = selectedNote === note
        ? (isDark ? "#ff6b6b" : "red")
        : (isDark ? "#ffffffdf" : "black");

    const screenX = note.x * scale + offsetX;
    const screenY = note.y * scale + offsetY;
    const screenW = note.width * scale;
    const screenH = note.height * scale;

    const borderOffset = 5;

    ctx.strokeRect(
        screenX - borderOffset,
        screenY - borderOffset,
        screenW + borderOffset * 2,
        screenH + borderOffset * 2
    );

    // Resize handle
    const handleSize = 8;
    ctx.fillRect(
        screenX + screenW + borderOffset - handleSize,
        screenY + screenH + borderOffset - handleSize,
        handleSize,
        handleSize
    );

    ctx.restore();
}

function draw() {

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = document.body.getAttribute("data-theme") === "dark";

    ctx.fillStyle = isDark ? "#2a2a2a" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // Draw order control
    notes.forEach(note => {
        if (note !== selectedNote) {
            drawSingleNote(note, isDark);
        }
    });

    if (selectedNote) {
        drawSingleNote(selectedNote, isDark);
    }

    updateEditorTransform();
}



function updateEditorTransform() {
    if (!activeTextarea || !editingNote) return;

    const x = editingNote.x * scale + offsetX;
    const y = editingNote.y * scale + offsetY;

    activeTextarea.style.left = x + "px";
    activeTextarea.style.top  = y + "px";


    activeTextarea.style.width  = editingNote.width + "px";
    activeTextarea.style.height = editingNote.height + "px";


    activeTextarea.style.transformOrigin = "top left";
    activeTextarea.style.transform = `scale(${scale})`;
}


function recomputeNoteHeight(note, ctx) {
    const padding = 10;
    const fontSize = note.fontSize || 16;
    const lineHeight = fontSize * 1.3;

    ctx.font = fontSize + "px Arial";

    const wrappedLines = wrapText(ctx, note.fullText, note.width - padding * 2);

    // Calculate required height, including all empty lines (\n) 
    const requiredHeight = wrappedLines.length * lineHeight + padding * 2;

    // Prevent shrinking below required height
    if (note.height < requiredHeight) {
        note.height = requiredHeight;
    }
}


// Event Listeners

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault(); 

    const pos = screenToWorld(e.offsetX, e.offsetY);
    const note = getNoteAt(pos.x, pos.y);

    if (!note) {
        noteMenu.style.display = "none";
        return;
    }

    selectedNote = note;

    // Position menu at mouse
    noteMenu.style.left = e.clientX + "px";
    noteMenu.style.top = e.clientY + "px";
    noteMenu.style.display = "block";
});

fontSizeSelect.addEventListener("click", (e) => {
    const item = e.target.closest("li");
    
    if (!item || !selectedNote) return;

    selectedNote.fontSize = parseInt(item.dataset.size);

    recomputeNoteHeight(selectedNote, ctx);
    saveNotes();
    draw();
});

bgColorSelect.addEventListener("click", (e) => {  
    const item = e.target.closest("li");
    if (!item || !selectedNote) return;
    selectedNote.bgColor = item.dataset.color;
    saveNotes();
    draw();
});


// Bring note to front
bringToFrontBtn.addEventListener("click", () => {
    if (!selectedNote) return;
    notes = notes.filter(n => n !== selectedNote); 
    notes.push(selectedNote);                      
    draw();
});

// Send note to back
sendToBackBtn.addEventListener("click", () => {
    if (!selectedNote) return;
    notes = notes.filter(n => n !== selectedNote); 
    notes.unshift(selectedNote);                   
    draw();
});

noteMenu.addEventListener("contextmenu", (e) => {
    e.stopPropagation();
});

themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    const newTheme = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", newTheme);
    saveNotes();
    draw();
});


window.addEventListener("mousedown", (e) => {
    if (e.button === 0 && !noteMenu.contains(e.target)) {
        noteMenu.style.display = "none";
    }
});


canvas.addEventListener("mousedown", (e) => {
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    const handleSize = 8;
    const borderOffset = 5;

    // Find resize handle
    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];

        const screenX = note.x * scale + offsetX;
        const screenY = note.y * scale + offsetY;
        const screenW = note.width * scale;
        const screenH = note.height * scale;

        const handleLeft = screenX + screenW + borderOffset - handleSize;
        const handleTop  = screenY + screenH + borderOffset - handleSize;

        if (
            mouseX >= handleLeft &&
            mouseX <= handleLeft + handleSize &&
            mouseY >= handleTop &&
            mouseY <= handleTop + handleSize
        ) {
            resizingNote = note;
            selectedNote = note;
            draw();
            return; 
        }
    }

    const pos = screenToWorld(mouseX, mouseY);
    const note = getNoteAt(pos.x, pos.y);

    if (note) {
        selectedNote = note;
        draggingNote = note;
        startX = pos.x - note.x;
        startY = pos.y - note.y;
    } else {
        selectedNote = null;
        isPanning = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
    }

    draw();
});


// This actually hurts me... (This is joke for anyone reading, I dont need a help, I am fine)
canvas.addEventListener("mousemove", (e) => {
    const pos = screenToWorld(e.offsetX, e.offsetY);
    mouseX = e.offsetX;
    mouseY = e.offsetY;

    if (draggingNote) {
        draggingNote.x = pos.x - startX;
        draggingNote.y = pos.y - startY;
        draw();
    }

    if (resizingNote) {
        const padding = 10;
        const fontSize = resizingNote.fontSize || 16;
        const lineHeight = fontSize * 1.3;

        ctx.font = fontSize + "px Arial";

        // Minimum width based on a single character
        const minWidth = ctx.measureText("i").width + padding * 2;
        let proposedWidth = pos.x - resizingNote.x;
        proposedWidth = Math.max(minWidth, proposedWidth);

        const wrappedLines = wrapText(ctx, resizingNote.fullText, proposedWidth - padding * 2);

        // Calculate required height, including all empty lines (\n)
        const requiredHeight = wrappedLines.length * lineHeight + padding * 2;

        let proposedHeight = pos.y - resizingNote.y;

        if (proposedHeight < requiredHeight) {
            proposedHeight = requiredHeight;
        }

        // Apply width and height
        resizingNote.width = proposedWidth;
        resizingNote.height = proposedHeight;

        draw();
    }

    if (isPanning) {
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        draw();
    }
});

canvas.addEventListener("mouseup", () => {
    draggingNote = null;
    resizingNote = null;
    isPanning = false;
});

//Creates a note, else if cursor on note, open text editor
canvas.addEventListener("dblclick", (e) => {
    const pos = screenToWorld(e.offsetX, e.offsetY);
    const note = getNoteAt(pos.x, pos.y);

    if (note) {
        openEditor(note);
    } else {
        notes.push({
            id: Date.now(),
            x: pos.x,
            y: pos.y,
            width: 200,
            height: 120,
            text: "",
            fullText: ""
        });
        saveNotes();
        draw();
    }
});


canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    const worldPosBefore = screenToWorld(mouseX, mouseY);

    scale *= zoomFactor;

    // This is highly limited as blur is quite painful with higher zooms, 
    // would need to implement svg style rendering or something similiar
    // Increasing font size would destroy my logic with current implementation
    const MIN_SCALE = 1.35;
    const MAX_SCALE = 3;

    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)); 

    const worldPosAfter = screenToWorld(mouseX, mouseY);

    offsetX += (worldPosAfter.x - worldPosBefore.x) * scale;
    offsetY += (worldPosAfter.y - worldPosBefore.y) * scale;

    draw();
});


// Copy, paste, delete handlers

window.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName === "TEXTAREA") return;

    if (e.ctrlKey && e.key.toLowerCase() === "c" && selectedNote) {
        clipboardNote = JSON.parse(JSON.stringify(selectedNote));
    }

    if (e.ctrlKey && e.key.toLowerCase() === "v" && clipboardNote) {
        const pos = screenToWorld(mouseX, mouseY);
        const newNote = JSON.parse(JSON.stringify(clipboardNote));
        newNote.id = Date.now();
        newNote.x = pos.x;
        newNote.y = pos.y;
        notes.push(newNote);
        selectedNote = newNote;
        saveNotes();
        draw();
    }

    if (e.key === "Delete" && selectedNote) {
        notes = notes.filter(n => n !== selectedNote);
        selectedNote = null;
        saveNotes();
        draw();
    }
});

button.addEventListener("click", () => {
    saveNotes();
});


// Textarea has limitations when it comes down to where your cursor/pointer starts, 
function openEditor(note) {

    const textarea = document.createElement("textarea");
    textarea.className = "note-editor";

    textarea.value = note.fullText;

    // Multiplying this by scale, breaks the note logic
    textarea.style.fontSize = (note.fontSize || 16) + "px";

    textarea.style.background = note.bgColor || "#fff8a6";
    textarea.style.textAlign = "center";
    textarea.style.lineHeight = textarea.style.fontSize * 1.3;

    activeTextarea = textarea;
    editingNote = note;
    document.body.appendChild(textarea);
    textarea.focus();

    updateEditorTransform();
    applyEditorTheme(textarea, note);



    // Live height resize
    textarea.addEventListener("input", () => {
        const requiredHeight = textarea.scrollHeight;

        if (requiredHeight > editingNote.height) {
            editingNote.height = requiredHeight;
            textarea.style.height = requiredHeight + "px";
            draw();
        }

        // Expand canvas when edit area increases beyond current canvas height
        const canvasRect = canvas.getBoundingClientRect();
        const editorRect = textarea.getBoundingClientRect();

        if (editorRect.bottom > canvasRect.bottom) {
            const overflow = editorRect.bottom - canvasRect.bottom;
            canvas.height += overflow + 50; // padding
            canvas.style.height = canvas.height + "px";
            draw();
        }
    });

    // Blur/save handler
    textarea.addEventListener("blur", () => {
        const newText = textarea.value;
        if (newText !== note.fullText) {
            note.fullText = newText; 
            note.text = newText;     
            textarea.style.height = "auto";
            note.height = textarea.scrollHeight;
            recomputeNoteHeight(note, ctx);
            saveNotes();
        }

        activeTextarea = null;
        editingNote = null;
        document.body.removeChild(textarea);
        draw();
    });
}


// Init

loadNotes();
resizeCanvas();
