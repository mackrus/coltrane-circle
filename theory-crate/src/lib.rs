use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::f64::consts::PI;

#[derive(Serialize, Deserialize)]
pub struct Note {
    pub name: String,
    pub index: u8,
    pub x: f64,
    pub y: f64,
    pub ring: u8,
}

#[derive(Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize)]
pub struct SequenceEvent {
    pub index: u8,
    pub time: f64,
    pub ring: u8,
}

#[wasm_bindgen]
pub fn get_circle_notes(outer_radius: f64, inner_radius: f64) -> JsValue {
    let chromatic = vec!["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    let fifths = vec!["C", "G", "D", "A", "E", "B", "Gb", "Db", "Ab", "Eb", "Bb", "F"];
    let mut notes = Vec::new();

    for (i, name) in chromatic.iter().enumerate() {
        let angle = (i as f64 * 30.0 - 90.0) * (PI / 180.0);
        notes.push(Note {
            name: name.to_string(),
            index: i as u8,
            x: outer_radius * angle.cos(),
            y: outer_radius * angle.sin(),
            ring: 0,
        });
    }

    for (i, name) in fifths.iter().enumerate() {
        let angle = (i as f64 * 30.0 - 90.0) * (PI / 180.0);
        let chromatic_index = (i as u8 * 7) % 12;
        notes.push(Note {
            name: name.to_string(),
            index: chromatic_index,
            x: inner_radius * angle.cos(),
            y: inner_radius * angle.sin(),
            ring: 1,
        });
    }

    serde_wasm_bindgen::to_value(&notes).unwrap()
}

#[wasm_bindgen]
pub fn get_polygon_points(root_index: u8, sides: u8, radius: f64) -> JsValue {
    let interval = 12 / sides;
    let mut points = Vec::new();
    for i in 0..sides {
        let note_index = (root_index + (i * interval)) % 12;
        let angle = (note_index as f64 * 30.0 - 90.0) * (PI / 180.0);
        points.push(Point { x: radius * angle.cos(), y: radius * angle.sin() });
    }
    serde_wasm_bindgen::to_value(&points).unwrap()
}

#[wasm_bindgen]
pub fn get_scale_indices(root_index: u8, scale_type: String) -> JsValue {
    let intervals = match scale_type.as_str() {
        "major" => vec![0, 2, 4, 5, 7, 9, 11],
        "minor" => vec![0, 2, 3, 5, 7, 8, 10],
        "dorian" => vec![0, 2, 3, 5, 7, 9, 10],
        "mixolydian" => vec![0, 2, 4, 5, 7, 9, 10],
        _ => vec![0, 2, 4, 5, 7, 9, 11],
    };

    let scale_notes: Vec<u8> = intervals.iter()
        .map(|&i| (root_index + i) % 12)
        .collect();

    serde_wasm_bindgen::to_value(&scale_notes).unwrap()
}

#[wasm_bindgen]
pub fn get_giant_steps_sequence(root_index: u8) -> JsValue {
    let sequence = vec![
        SequenceEvent { index: root_index, time: 0.0, ring: 0 },
        // Descend by major third: -4 semitones = +8 mod 12
        SequenceEvent { index: (root_index + 8) % 12, time: 0.5, ring: 0 },
        // Descend by another major third: -8 semitones = +4 mod 12
        SequenceEvent { index: (root_index + 4) % 12, time: 1.0, ring: 0 },
        SequenceEvent { index: root_index, time: 1.5, ring: 0 },
    ];
    serde_wasm_bindgen::to_value(&sequence).unwrap()
}

#[wasm_bindgen]
pub fn get_fifths_sequence(start_index: u8) -> JsValue {
    let mut sequence = Vec::new();
    for i in 0..13 {
        let chromatic_index = (start_index + i as u8 * 7) % 12;
        sequence.push(SequenceEvent { index: chromatic_index, time: i as f64 * 0.4, ring: 1 });
    }
    serde_wasm_bindgen::to_value(&sequence).unwrap()
}
