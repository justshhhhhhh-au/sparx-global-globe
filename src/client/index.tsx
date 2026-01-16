import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";
import type { LegacyRef } from "react";

function App() {
	// A reference to the canvas element where we'll render the globe
	const canvasRef = useRef<HTMLCanvasElement>();
	// The number of markers we're currently displaying
	const [counter, setCounter] = useState(0);
	// A map of marker IDs to their positions
	// Note that we use a ref because the globe's `onRender` callback
	// is called on every animation frame, and we don't want to re-render
	// the component on every frame.
	const positions = useRef<
		Map<
			string,
			{
				location: [number, number];
				size: number;
			}
		>
	>(new Map());
	// Connect to the PartyServer server
	const socket = usePartySocket({
		room: "default",
		party: "globe",
		onMessage(evt) {
			const message = JSON.parse(evt.data as string) as OutgoingMessage;
			if (message.type === "add-marker") {
				// Add the marker to our map
				positions.current.set(message.position.id, {
					location: [message.position.lat, message.position.lng],
					size: message.position.id === socket.id ? 0.1 : 0.05,
				});
				// Update the counter
				setCounter((c) => c + 1);
			} else {
				// Remove the marker from our map
				positions.current.delete(message.id);
				// Update the counter
				setCounter((c) => c - 1);
			}
		},
	});

	useEffect(() => {
		// The angle of rotation of the globe
		// We'll update this on every frame to make the globe spin
		let phi = 0;

const globe = createGlobe(canvasRef.current as HTMLCanvasElement, {
    devicePixelRatio: 2,
    width: 400 * 2,
    height: 400 * 2,
    phi: 0,
    theta: 0,
    dark: 1,           // Keep this at 1 for the dark background
    diffuse: 0.8,
    mapSamples: 16000,
    mapBrightness: 6,
    
    // --- UPDATE THESE COLORS ---
    baseColor: [0.0, 0.2, 0.05],    // Dark forest green base
    markerColor: [0.0, 1.0, 0.25],  // Bright "Matrix" green for users
    glowColor: [0.0, 0.3, 0.1],     // Subtle green atmospheric glow
    
    markers: [],
    opacity: 0.9,      // Increased opacity for a sharper look
    onRender: (state) => {
        state.markers = [...positions.current.values()];
        state.phi = phi;
        phi += 0.005;  // Slowed rotation slightly for a more "stable" feel
    },
});

		return () => {
			globe.destroy();
		};
	}, []);

return (
    <div className="App" style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        <h1>[ SYSTEM_LOCATOR ]</h1>
        {counter !== 0 ? (
            <p>> ONLINE_NODES: {counter}</p>
        ) : (
            <p>> SCANNING...</p>
        )}
        {/* ... rest of the code ... */}
    </div>
);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
