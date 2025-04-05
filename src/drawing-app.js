// Import drawing functions and hit-test helpers for each shape type
import {
    drawRectangle,
    isInsideRectangle,
    isInResizeHandle,
    isInRotateHandle,
} from "./components/rectangle";
import { drawFreehand, isInsideFreehand } from "./components/freehand";
import {
    drawLine,
    isInsideLine,
    isInResizeHandleLine,
    isInRotateHandleLine,
} from "./components/line";
import {
    drawCircle,
    isInsideCircle,
    isInResizeHandleCircle,
} from "./components/circle";
import { drawLabel, isInsideLabel } from "./components/label";
import { toolButtons } from "./config/tool-buttons.js";

// Main Alpine.js component definition
export default function drawingApp() {
    return {
        toolButtons,

        // Current selected tool
        tool: "rectangle",

        // Canvas reference and 2D drawing context
        canvas: null,
        ctx: null,

        // Array to store all drawn shapes
        shapes: [],

        // Current shape being drawn
        current: null,

        // Various drawing state flags
        isDrawing: false,
        isDragging: false,
        isTransforming: false,
        transformType: null, // can be 'resize' or 'rotate'

        // Index of selected shape in shapes array
        selectedIndex: -1,

        // Offset between mouse position and shape's origin when dragging
        dragOffset: { x: 0, y: 0 },

        // Download URL for saving the canvas as an image
        downloadUrl: null,

        // Real-world garden size
        gardenWidthMeters: 10,
        gardenHeightMeters: 15,
        scale: 1, // px per meter

        // Margin around the garden border in pixels
        canvasMargin: 40,

        undoStack: [],
        redoStack: [],

        hoverInfo: null,

        hasInitialized: false,

        showControlPanel: false,

        // Called once at initialization
        init() {
            if (this.hasInitialized) return;
            this.hasInitialized = true;

            this.canvas = document.getElementById("canvas");
            this.ctx = this.canvas.getContext("2d");

            this.resizeCanvas(); // ✅ Make sure canvas has correct size first
            this.restoreFromLocalStorage(); // ✅ Then load saved values + draw garden border

            window.addEventListener("keydown", (e) => {
                const tag = document.activeElement.tagName.toLowerCase();

                // Don't trigger hotkeys when typing in input/textarea
                if (tag === "input" || tag === "textarea") return;

                if (
                    (e.key === "Delete" || e.key === "Backspace") &&
                    this.selectedIndex !== -1
                ) {
                    this.deleteSelected();
                } else if (e.ctrlKey && e.key === "z") {
                    if (e.shiftKey) this.redo();
                    else this.undo();
                } else if (e.ctrlKey && e.key === "y") {
                    this.redo();
                }
            });
        },

        toggleControlPanel() {
            this.showControlPanel = !this.showControlPanel;
        },

        updateGardenSize(width, height) {
            this.gardenWidthMeters = width;
            this.gardenHeightMeters = height;
            this.computeScaleAndDrawGarden(); // this will redraw with updated proportions
            this.saveToLocalStorage();
        },

        pushToUndoStack() {
            this.undoStack.push(JSON.stringify(this.shapes));
            if (this.undoStack.length > 50) this.undoStack.shift(); // optional cap
            this.redoStack = []; // clear redo after new action
        },

        undo() {
            if (this.undoStack.length > 0) {
                this.redoStack.push(JSON.stringify(this.shapes));
                const lastState = this.undoStack.pop();
                this.shapes = JSON.parse(lastState);
                this.selectedIndex = -1;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        redo() {
            if (this.redoStack.length > 0) {
                this.undoStack.push(JSON.stringify(this.shapes));
                const nextState = this.redoStack.pop();
                this.shapes = JSON.parse(nextState);
                this.selectedIndex = -1;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        // Makes sure canvas size matches its visible size
        resizeCanvas() {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
        },

        // Select the current drawing tool
        setTool(t) {
            this.tool = t;
            this.selectedIndex = -1; // deselect any selected shape
            this.saveToLocalStorage();
        },

        get shape() {
            return this.shapes[this.selectedIndex] ?? {};
        },

        // Helper to get canvas-relative coordinates from a mouse/touch event
        getPos(e) {
            // Get the size and position of the canvas in the viewport
            const rect = this.canvas.getBoundingClientRect();

            // Support both mouse and touch events
            // If it's a touch event (mobile/tablet), use the first touch point
            const evt = e.touches ? e.touches[0] : e;

            // Calculate scale factor between canvas's actual size and its displayed size
            // This accounts for responsive scaling (e.g., Tailwind's w-full)
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            // Calculate the actual x and y on the canvas
            // Subtract the canvas's left/top offset from the event's position,
            // then apply the scale factor to map to actual canvas resolution
            return {
                x: (evt.clientX - rect.left) * scaleX,
                y: (evt.clientY - rect.top) * scaleY,
            };
        },

        // Called when user starts interaction (mousedown/touchstart)
        start(e) {
            // Prevent default browser behavior (e.g., scrolling on touch devices)
            e.preventDefault();

            // Convert mouse/touch coordinates into canvas-relative coordinates
            const pos = this.getPos(e);

            // Reset the download URL so it hides the "Download" link when user draws again
            this.downloadUrl = null;

            this.pushToUndoStack();

            // --- [1] Check if the user clicked on a resize handle of a shape
            const resizeIndex = this.findResizeHandleAt(pos);
            if (resizeIndex !== -1) {
                this.selectedIndex = resizeIndex; // Select the shape being resized
                this.isTransforming = true; // Set mode to "transform"
                this.transformType = "resize"; // Specify this is a resize operation
                return; // Exit early — no new shape drawing
            }

            // --- [2] Check if the user clicked on a rotate handle
            const rotateIndex = this.findRotateHandleAt(pos);
            if (rotateIndex !== -1) {
                this.selectedIndex = rotateIndex; // Select the shape being rotated
                this.isTransforming = true;
                this.transformType = "rotate";
                return;
            }

            // --- [3] Check if the user clicked on an existing shape (to drag it)
            const shape = this.findShapeAt(pos);
            if (shape) {
                const index = this.shapes.indexOf(shape);
                if (this.selectedIndex === index) {
                    this.dragOffset = {
                        x: pos.x - shape.x,
                        y: pos.y - shape.y,
                    };
                    this.isDragging = true;
                } else {
                    this.selectedIndex = index;
                }
                this.redraw();
                return;
            } else {
                this.selectedIndex = -1;
                this.redraw(); // force deselection redraw
            }

            // --- [4] Special case: label tool opens a text prompt
            if (this.tool === "label") {
                const text = prompt("Enter label text:"); // Ask user for label text
                if (text) {
                    this.shapes.push({
                        type: "label",
                        x: pos.x,
                        y: pos.y,
                        text,
                    }); // Add label
                    this.redraw(); // Redraw canvas with new label
                }
                return; // Done with label creation
            }

            // --- [5] If none of the above: start drawing a new shape

            this.selectedIndex = -1; // Deselect any active shape
            this.isDrawing = true; // Set flag to indicate drawing mode

            // Create the initial shape data
            this.current = { type: this.tool, x: pos.x, y: pos.y };

            // If drawing a line, set up length and angle (will be updated during move)
            if (this.tool === "line") {
                this.current.length = 0;
                this.current.angle = 0;
            }

            // If drawing freehand, store initial point
            if (this.tool === "freehand") {
                this.current.points = [{ x: pos.x, y: pos.y }];
            }
        },

        // Called on mouse/touch move
        move(e) {
            // Get current mouse or touch position relative to the canvas
            const pos = this.getPos(e);

            // Dynamically update the mouse cursor based on what’s under the pointer
            this.canvas.style.cursor = this.getCursorStyle(pos);

            // --- [1] HANDLE TRANSFORMATION (RESIZE / ROTATE) ---
            if (this.isTransforming && this.selectedIndex !== -1) {
                const shape = this.shapes[this.selectedIndex];

                // Calculate delta from shape center/origin to current mouse position
                const dx = pos.x - shape.x;
                const dy = pos.y - shape.y;

                if (this.transformType === "resize") {
                    if (shape.type === "rectangle") {
                        // Update rectangle's width and height based on drag
                        shape.width = dx;
                        shape.height = dy;
                    } else if (shape.type === "line") {
                        // Update line's length based on distance from origin
                        shape.length = Math.hypot(dx, dy);
                    } else if (shape.type === "circle") {
                        shape.radius = Math.hypot(dx, dy);
                    }
                } else if (this.transformType === "rotate") {
                    if (shape.type === "rectangle") {
                        // Set rectangle's rotation angle in radians
                        shape.rotation = Math.atan2(dy, dx);
                    } else if (shape.type === "line") {
                        // Set line's angle in radians
                        shape.angle = Math.atan2(dy, dx);
                    }
                }

                this.redraw(); // Redraw all shapes to reflect transformation
                this.drawShape(this.current, true);
                return; // Exit — nothing else should happen during transformation
            }

            // --- [2] HANDLE DRAGGING A SHAPE ---
            if (this.isDragging && this.selectedIndex !== -1) {
                const shape = this.shapes[this.selectedIndex];

                const dx = pos.x - shape.x - this.dragOffset.x;
                const dy = pos.y - shape.y - this.dragOffset.y;

                shape.x += dx;
                shape.y += dy;

                if (shape.type === "freehand") {
                    shape.points = shape.points.map((p) => ({
                        x: p.x + dx,
                        y: p.y + dy,
                    }));
                }

                this.hoverInfo = {
                    xDistance:
                        Math.abs(shape.x - this.gardenRect.x) / this.scale,
                    yDistance:
                        Math.abs(shape.y - this.gardenRect.y) / this.scale,
                };

                this.redraw();

                this.dragOffset = {
                    x: pos.x - shape.x,
                    y: pos.y - shape.y,
                };

                return;
            }

            // --- [3] HANDLE LIVE DRAWING OF A NEW SHAPE ---
            if (this.isDrawing && this.current) {
                if (this.tool === "line") {
                    // Update the line's length and angle based on drag
                    const dx = pos.x - this.current.x;
                    const dy = pos.y - this.current.y;
                    this.current.length = Math.hypot(dx, dy);
                    this.current.angle = Math.atan2(dy, dx);
                } else if (this.tool === "freehand") {
                    // Add a new point to the freehand path
                    this.current.points.push({ x: pos.x, y: pos.y });
                } else {
                    // Calculate width and height based on drag direction
                    this.current.width = pos.x - this.current.x;
                    this.current.height = pos.y - this.current.y;

                    if (this.tool === "circle") {
                        // For circles, use the diagonal distance as the radius
                        this.current.radius = Math.hypot(
                            this.current.width,
                            this.current.height
                        );
                    }
                }

                this.redraw(); // Clear and redraw all saved shapes
                this.drawShape(this.current, true); // Draw the "live preview" of the new shape
            }
        },

        isSelected(index) {
            return this.selectedIndex === index;
        },

        selectShape(index) {
            this.selectedIndex = index;
            this.redraw();
        },

        renameShape(index) {
            const shape = this.shapes[index];
            const newName = prompt("Rename shape:", shape.name);
            if (newName && newName.trim() !== "") {
                shape.name = newName.trim();
                this.saveToLocalStorage();
            }
        },

        // Called on mouse/touch up or leave
        end() {
            // Save the drawn shape to the array
            if (this.isDrawing && this.current) {
                // Assign a default name based on type + count
                const count =
                    this.shapes.filter((s) => s.type === this.current.type)
                        .length + 1;
                this.current.name = `${
                    this.current.type.charAt(0).toUpperCase() +
                    this.current.type.slice(1)
                } ${count}`;

                this.shapes.push({ ...this.current });
                this.saveToLocalStorage();
            }
            this.isDrawing = false;
            this.isDragging = false;
            this.isTransforming = false;
            this.transformType = null;
            this.current = null;
            this.hoverInfo = null;
        },

        // Clears all shapes
        clearCanvas() {
            this.shapes = [];
            this.selectedIndex = -1;
            this.redraw();
            this.saveToLocalStorage();
        },

        saveToLocalStorage() {
            localStorage.setItem(
                `${window.location.href}_shapes`,
                JSON.stringify(this.shapes)
            );
            localStorage.setItem(
                `${window.location.href}_gardenWidth`,
                this.gardenWidthMeters
            );
            localStorage.setItem(
                `${window.location.href}_gardenHeight`,
                this.gardenHeightMeters
            );
        },

        restoreFromLocalStorage() {
            const shapes = localStorage.getItem(
                `${window.location.href}_shapes`
            );
            const width = localStorage.getItem(
                `${window.location.href}_gardenWidth`
            );
            const height = localStorage.getItem(
                `${window.location.href}_gardenHeight`
            );

            if (shapes) {
                this.shapes = JSON.parse(shapes);
            }

            if (width && height) {
                this.gardenWidthMeters = parseFloat(width);
                this.gardenHeightMeters = parseFloat(height);
            }

            this.computeScaleAndDrawGarden(); // also redraws
        },

        // Creates an image URL of the canvas for download
        saveCanvas() {
            // Temporarily draw white background
            const original = this.ctx.getImageData(
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );

            this.ctx.save();
            this.ctx.globalCompositeOperation = "destination-over";
            this.ctx.fillStyle = "white";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();

            // Generate image
            this.downloadUrl = this.canvas.toDataURL("image/png");

            // Restore canvas to previous state
            this.ctx.putImageData(original, 0, 0);
        },

        // Draw one shape (with optional highlight)
        drawShape(s, highlight = false) {
            if (s.type === "rectangle") {
                drawRectangle(this.ctx, s, highlight);
            } else if (s.type === "line") {
                drawLine(this.ctx, s, highlight);
            } else if (s.type === "circle") {
                drawCircle(this.ctx, s, highlight);
            } else if (s.type === "label") {
                drawLabel(this.ctx, s);
            } else if (s.type === "freehand") {
                drawFreehand(this.ctx, s);
            }

            // ✅ Always check after shape is drawn
            if (highlight) {
                this.drawMeasurementTooltip(s);
            }
        },

        // Redraw all shapes from scratch
        redraw() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (this.gardenRect) {
                this.ctx.strokeStyle = "gray";
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeRect(
                    this.gardenRect.x,
                    this.gardenRect.y,
                    this.gardenRect.width,
                    this.gardenRect.height
                );
                this.ctx.setLineDash([]);

                // 🏷 Show garden dimensions
                const label = `${this.gardenWidthMeters.toFixed(
                    2
                )}m × ${this.gardenHeightMeters.toFixed(2)}m`;
                this.ctx.save();
                this.ctx.font = "14px sans-serif";
                this.ctx.fillStyle = "black";
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 3;

                const labelX =
                    this.gardenRect.x +
                    this.gardenRect.width / 2 -
                    this.ctx.measureText(label).width / 2;
                const labelY = this.gardenRect.y - 10;

                this.ctx.strokeText(label, labelX, labelY);
                this.ctx.fillText(label, labelX, labelY);
                this.ctx.restore();
            }

            this.shapes.forEach((s, i) => {
                this.drawShape(s, i === this.selectedIndex);

                // ✅ Always draw size label for selected shape
                if (
                    i === this.selectedIndex &&
                    s.type !== "label" &&
                    s.type !== "freehand"
                ) {
                    this.drawMeasurementTooltip(s);
                }
            });

            if (
                this.hoverInfo &&
                this.selectedIndex !== -1 &&
                this.isDragging
            ) {
                const shape = this.shapes[this.selectedIndex];
                const { xDistance, yDistance } = this.hoverInfo;
                const label = `${xDistance.toFixed(
                    2
                )}m from left, ${yDistance.toFixed(2)}m from top`;

                this.ctx.save();
                this.ctx.font = "13px sans-serif";
                this.ctx.fillStyle = "black";
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 3;

                const x = shape.x + 10;
                const y = shape.y + 20;

                this.ctx.strokeText(label, x, y);
                this.ctx.fillText(label, x, y);
                this.ctx.restore();
            }
        },

        // Find shape under the cursor, starting from topmost
        findShapeAt(pos) {
            return [...this.shapes].reverse().find((s) => {
                if (s.type === "rectangle") return isInsideRectangle(pos, s);
                if (s.type === "line") return isInsideLine(pos, s);
                if (s.type === "circle") return isInsideCircle(pos, s);
                if (s.type === "freehand") return isInsideFreehand(pos, s);
                if (s.type === "label") return isInsideLabel(this.ctx, pos, s);
                return false;
            });
        },

        // Check if cursor is on any resize handle
        findResizeHandleAt(pos) {
            return this.shapes.findIndex((s) => {
                if (s.type === "rectangle") return isInResizeHandle(pos, s);
                if (s.type === "line") return isInResizeHandleLine(pos, s);
                if (s.type === "circle") return isInResizeHandleCircle(pos, s);
                return false;
            });
        },

        // Check if cursor is on any rotate handle
        findRotateHandleAt(pos) {
            return this.shapes.findIndex((s) => {
                if (s.type === "rectangle") return isInRotateHandle(pos, s);
                if (s.type === "line") return isInRotateHandleLine(pos, s);
                return false;
            });
        },

        // Change cursor based on hover context
        getCursorStyle(pos) {
            if (this.findResizeHandleAt(pos) !== -1) return "nwse-resize";
            if (this.findRotateHandleAt(pos) !== -1) return "crosshair";
            const shape = this.findShapeAt(pos);
            return shape
                ? "move"
                : this.tool === "label"
                ? "text"
                : "crosshair";
        },

        deleteSelected() {
            if (this.selectedIndex !== -1) {
                this.shapes.splice(this.selectedIndex, 1); // Remove selected shape
                this.selectedIndex = -1; // Deselect
                this.redraw(); // Redraw canvas
                this.saveToLocalStorage();
            }
        },

        computeScaleAndDrawGarden() {
            const availableWidth = this.canvas.width - this.canvasMargin * 2;
            const availableHeight = this.canvas.height - this.canvasMargin * 2;

            const scaleX = availableWidth / this.gardenWidthMeters;
            const scaleY = availableHeight / this.gardenHeightMeters;

            this.scale = Math.min(scaleX, scaleY); // keep proportions
            this.drawGardenBorder();
        },

        drawGardenBorder() {
            const width = this.gardenWidthMeters * this.scale;
            const height = this.gardenHeightMeters * this.scale;

            const x = (this.canvas.width - width) / 2;
            const y = (this.canvas.height - height) / 2;

            this.gardenRect = { x, y, width, height };

            this.redraw();

            // Draw border labels after redraw
            this.ctx.save();
            this.ctx.font = "14px sans-serif";
            this.ctx.fillStyle = "black";
            this.ctx.strokeStyle = "white";
            this.ctx.lineWidth = 3;

            // Width label (top center)
            const widthLabel = `${this.gardenWidthMeters}m`;
            const widthX =
                x + width / 2 - this.ctx.measureText(widthLabel).width / 2;
            const widthY = y - 10;
            this.ctx.strokeText(widthLabel, widthX, widthY);
            this.ctx.fillText(widthLabel, widthX, widthY);

            // Height label (left center, rotated)
            const heightLabel = `${this.gardenHeightMeters}m`;
            const heightX = x - 10;
            const heightY = y + height / 2;

            this.ctx.save();
            this.ctx.translate(heightX, heightY);
            this.ctx.rotate(-Math.PI / 2);
            this.ctx.strokeText(
                heightLabel,
                -this.ctx.measureText(heightLabel).width / 2,
                -4
            );
            this.ctx.fillText(
                heightLabel,
                -this.ctx.measureText(heightLabel).width / 2,
                -4
            );
            this.ctx.restore();

            this.ctx.restore();
        },

        drawMeasurementTooltip(s) {
            const ctx = this.ctx;
            let label = "";
            if (s.type === "rectangle") {
                const width = Math.abs(s.width) / this.scale;
                const height = Math.abs(s.height) / this.scale;
                label = `${width.toFixed(2)}m × ${height.toFixed(2)}m`;
            } else if (s.type === "line") {
                const length = s.length / this.scale;
                label = `${length.toFixed(2)}m`;
            } else if (s.type === "circle") {
                const r = s.radius / this.scale;
                const d = 2 * r;
                label = `r = ${r.toFixed(2)}m | Ø = ${d.toFixed(2)}m`;
            }

            if (!label) return;

            ctx.save();
            ctx.font = "14px sans-serif";
            ctx.fillStyle = "black";
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;

            // Tooltip position
            const x = s.x + 10;
            const y = s.y - 10;

            ctx.strokeText(label, x, y);
            ctx.fillText(label, x, y);
            ctx.restore();
        },

        getShapeXInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape
                ? ((shape.x - this.gardenRect.x) / this.scale).toFixed(2)
                : "";
        },

        getShapeYInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape
                ? ((shape.y - this.gardenRect.y) / this.scale).toFixed(2)
                : "";
        },

        updateShapeXInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape) {
                shape.x = this.gardenRect.x + parseFloat(val) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        updateShapeYInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape) {
                shape.y = this.gardenRect.y + parseFloat(val) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        getShapeWidthInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape ? (shape.width / this.scale).toFixed(2) : "";
        },

        getShapeHeightInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape ? (shape.height / this.scale).toFixed(2) : "";
        },

        updateShapeWidthInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape) {
                shape.width = parseFloat(val) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        updateShapeHeightInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape) {
                shape.height = parseFloat(val) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        getLineLengthInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape && shape.type === "line"
                ? (shape.length / this.scale).toFixed(2)
                : "";
        },

        updateLineLengthInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape && shape.type === "line") {
                shape.length = parseFloat(val) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        getCircleRadiusInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape && shape.type === "circle"
                ? (shape.radius / this.scale).toFixed(2)
                : "";
        },

        updateCircleRadiusInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape && shape.type === "circle") {
                shape.radius = parseFloat(val) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },

        getCircleDiameterInMeters() {
            const shape = this.shapes[this.selectedIndex];
            return shape && shape.type === "circle"
                ? ((shape.radius * 2) / this.scale).toFixed(2)
                : "";
        },

        updateCircleDiameterInMeters(val) {
            const shape = this.shapes[this.selectedIndex];
            if (shape && shape.type === "circle") {
                shape.radius = (parseFloat(val) / 2) * this.scale;
                this.redraw();
                this.saveToLocalStorage();
            }
        },
    };
}
