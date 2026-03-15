// @ts-ignore
import init, { get_circle_notes, get_polygon_points, get_scale_indices, get_giant_steps_sequence, get_fifths_sequence } from "./pkg/theory_crate.js";
import * as Tone from "tone";

interface Note {
  name: string;
  index: number;
  x: number;
  y: number;
  ring: number;
}

interface Point {
  x: number;
  y: number;
}

interface SequenceEvent {
  index: number;
  time: number;
  ring: number;
}

const svg = document.getElementById("coltraneSVG") as unknown as SVGSVGElement;
const synth = new Tone.Synth().toDestination();
let currentPolygon: SVGPolygonElement | null = null;
let bridgeLine: SVGLineElement | null = null;
let isAudioStarted = false;
let noteElements: Map<string, SVGCircleElement> = new Map();
let textElements: Map<string, SVGTextElement> = new Map();
let noteData: Note[] = [];
let lastActiveIndex: number = 11;
let currentSides: number = 3;

// Scale State
let isScaleHighlighting = false;
let scaleRoot = 0;
let scaleType = "major";

async function startAudioOnce() {
  if (!isAudioStarted) {
    await Tone.start();
    isAudioStarted = true;
  }
}

function updatePolygon(rootIndex: number, sides: number, radius: number) {
  const points: Point[] = get_polygon_points(rootIndex, sides, radius);
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(" ");
  if (!currentPolygon) {
    currentPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    currentPolygon.setAttribute("id", "trigon");
    currentPolygon.setAttribute("style", "fill: none; stroke: #ff9900; stroke-width: 1; opacity: 0.7; transition: points 0.5s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none;");
    svg.insertBefore(currentPolygon, svg.firstChild);
  }
  currentPolygon.setAttribute("points", pointsStr);
}

function updateScaleHighlights() {
    if (!isScaleHighlighting) {
        noteElements.forEach(el => el.classList.remove("in-scale"));
        textElements.forEach(el => el.classList.remove("off-scale"));
        return;
    }

    const scaleIndices: number[] = get_scale_indices(scaleRoot, scaleType);
    
    noteData.forEach(note => {
        const circle = noteElements.get(`${note.index}-${note.ring}`);
        const text = textElements.get(`${note.index}-${note.ring}`);
        if (circle && text) {
            if (scaleIndices.includes(note.index)) {
                circle.classList.add("in-scale");
                text.classList.remove("off-scale");
            } else {
                circle.classList.remove("in-scale");
                text.classList.add("off-scale");
            }
        }
    });
}

function showBridge(fromIndex: number, fromRing: number) {
    const fromNote = noteData.find(n => n.index === fromIndex && n.ring === fromRing);
    const toNote = noteData.find(n => n.index === fromIndex && n.ring !== fromRing);
    if (fromNote && toNote && bridgeLine) {
        bridgeLine.setAttribute("x1", fromNote.x.toString()); bridgeLine.setAttribute("y1", fromNote.y.toString());
        bridgeLine.setAttribute("x2", toNote.x.toString()); bridgeLine.setAttribute("y2", toNote.y.toString());
        bridgeLine.classList.add("visible");
    }
}

function hideBridge() { if (bridgeLine) bridgeLine.classList.remove("visible"); }

function playSequence(events: SequenceEvent[]) {
  const now = Tone.now();
  events.forEach(event => {
    const note = noteData.find(n => n.index === event.index && n.ring === event.ring);
    if (!note) return;
    synth.triggerAttackRelease(`${note.name}${event.ring === 0 ? 4 : 3}`, "8n", now + event.time);
    setTimeout(() => {
        lastActiveIndex = event.index;
        const el = noteElements.get(`${note.index}-${note.ring}`);
        if (el) { el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 300); }
        updatePolygon(event.index, currentSides, 120);
        showBridge(event.index, event.ring);
        setTimeout(hideBridge, 300);
    }, event.time * 1000);
  });
}

async function main() {
  await init();

  const outerRadius = 120;
  const innerRadius = 80;

  // Bridge line
  bridgeLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  bridgeLine.setAttribute("class", "harmonic-bridge");
  svg.insertBefore(bridgeLine, svg.firstChild);

  updatePolygon(lastActiveIndex, currentSides, outerRadius);

  // Decorative frame
  const frame = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  frame.setAttribute("cx", "0"); frame.setAttribute("cy", "0");
  frame.setAttribute("r", outerRadius.toString());
  frame.setAttribute("fill", "none"); frame.setAttribute("stroke", "rgba(255, 255, 255, 0.07)");
  svg.appendChild(frame);

  // Render Notes
  noteData = get_circle_notes(outerRadius, innerRadius);
  noteData.forEach((note) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", note.x.toString()); circle.setAttribute("cy", note.y.toString());
    circle.setAttribute("r", note.ring === 0 ? "15" : "11");
    circle.setAttribute("class", "note-circle");
    noteElements.set(`${note.index}-${note.ring}`, circle);

    circle.onclick = async () => {
        await startAudioOnce();
        lastActiveIndex = note.index;
        updatePolygon(note.index, currentSides, outerRadius);
        synth.triggerAttackRelease(`${note.name}${note.ring === 0 ? 4 : 3}`, "8n");
        circle.classList.add('active');
        setTimeout(() => circle.classList.remove('active'), 200);
    };
    circle.onmouseenter = () => showBridge(note.index, note.ring);
    circle.onmouseleave = hideBridge;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", note.x.toString()); text.setAttribute("y", (note.y + 4).toString());
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "label");
    text.setAttribute("font-size", note.ring === 0 ? "13" : "10");
    text.textContent = note.name;
    textElements.set(`${note.index}-${note.ring}`, text);

    group.appendChild(circle); group.appendChild(text);
    svg.appendChild(group);
  });

  // UI LISTENERS
  const symButtons = document.querySelectorAll(".symmetry-btn");
  symButtons.forEach(btn => {
    (btn as HTMLButtonElement).onclick = () => {
        symButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentSides = parseInt(btn.getAttribute("data-sides") || "3");
        updatePolygon(lastActiveIndex, currentSides, outerRadius);
    };
  });

  const rootSelect = document.getElementById("scale-root") as HTMLSelectElement;
  const typeSelect = document.getElementById("scale-type") as HTMLSelectElement;
  const toggleBtn = document.getElementById("toggle-scale") as HTMLButtonElement;

  rootSelect.onchange = () => { scaleRoot = parseInt(rootSelect.value); updateScaleHighlights(); };
  typeSelect.onchange = () => { scaleType = typeSelect.value; updateScaleHighlights(); };
  toggleBtn.onclick = () => {
      isScaleHighlighting = !isScaleHighlighting;
      toggleBtn.textContent = isScaleHighlighting ? "Highlight On" : "Highlight Off";
      toggleBtn.classList.toggle("toggle-active", isScaleHighlighting);
      updateScaleHighlights();
  };

  document.getElementById("play-giant-steps")!.onclick = async () => {
    await startAudioOnce();
    playSequence(get_giant_steps_sequence(lastActiveIndex));
  };

  document.getElementById("play-fifths")!.onclick = async () => {
    await startAudioOnce();
    playSequence(get_fifths_sequence(lastActiveIndex));
  };

  // Instructions Modal
  const instrBtn = document.getElementById("instructions-btn");
  const closeInstr = document.getElementById("close-instructions");
  const modal = document.getElementById("instructions-modal");
  
  if (instrBtn && closeInstr && modal) {
    instrBtn.onclick = () => modal.style.display = "flex";
    closeInstr.onclick = () => modal.style.display = "none";
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
  }
}

main();
