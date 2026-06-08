import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";

// Strongly-typed marker used by the globe
type GlobeMarker = {
	location: [number, number]; // [lat, lng]
	size: number;
};

function isAddMarker(msg: any): msg is { type: "add-marker"; position: { lat: number; lng: number; id: string } } {
	return msg && msg.type === "add-marker" && msg.position && typeof msg.position.lat === "number" && typeof msg.position.lng === "number" && typeof msg.position.id === "string";
}

function isRemoveMarker(msg: any): msg is { type: "remove-marker"; id: string } {
	return msg && msg.type === "remove-marker" && typeof msg.id === "string";
}

function App() {
	// A reference to the canvas element where we'll render the globe
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const globeRef = useRef<any | null>(null);
	// The number of markers we're currently displaying
	const [counter, setCounter] = useState(0);
	// A map of marker IDs to their positions
	const positions = useRef<Map<string, GlobeMarker>>(new Map());

	// Connect to the PartyServer server
	const socket = usePartySocket({
		room: "default",
		party: "globe",
		onMessage(evt) {
			try {
				const parsed = JSON.parse(evt.data as string) as unknown;
				if (isAddMarker(parsed)) {
					// Defensive: validate lat/lng ranges
					const lat = Math.max(-90, Math.min(90, parsed.position.lat));
					const lng = Math.max(-180, Math.min(180, parsed.position.lng));
					positions.current.set(parsed.position.id, {
						location: [lat, lng],
						size: parsed.position.id === socket?.id ? 0.1 : 0.05,
					});
				} else if (isRemoveMarker(parsed)) {
					positions.current.delete(parsed.id);
				} else {
					// Unknown message type - ignore
					return;
				}
				// keep the counter strictly in sync with the map size
				setCounter(positions.current.size);
			} catch (err) {
				console.warn("Received invalid socket message", err);
			}
		},
	});

	// Ensure socket is cleaned up if possible when component unmounts
	useEffect(() => {
		return () => {
			if (socket) {
				if (typeof (socket as any).close === "function") {
					try {
						(socket as any).close();
					} catch (e) {
						/* ignore */
					}
				}
				if (typeof (socket as any).disconnect === "function") {
					try {
						(socket as any).disconnect();
					} catch (e) {
						/* ignore */
					}
				}
			}
		};
	}, [socket]);

	// Create / recreate the globe when the canvas mounts or the window resizes/devicePixelRatio changes
	useEffect(() => {
		if (!canvasRef.current) return;

		let mounted = true;
		let resizeTimer: number | undefined;

		const create = () => {
			if (!canvasRef.current) return;

			const dpr = Math.max(1, window.devicePixelRatio || 1);
			const clientWidth = Math.max(200, canvasRef.current.clientWidth || 400);
			const clientHeight = Math.max(200, canvasRef.current.clientHeight || 400);
			const width = Math.floor(clientWidth * dpr);
			const height = Math.floor(clientHeight * dpr);

			// destroy existing globe first
			if (globeRef.current && typeof globeRef.current.destroy === "function") {
				try {
					globeRef.current.destroy();
				} catch (e) {
					/* ignore */
				}
			}

			let phi = 0;
			globeRef.current = createGlobe(canvasRef.current, {
				devicePixelRatio: dpr,
				width,
				height,
				phi: 0,
				theta: 0,
				dark: 1,
				diffuse: 0.8,
				mapSamples: 16000,
				mapBrightness: 6,

				baseColor: [0.0, 0.2, 0.05],
				markerColor: [0.0, 1.0, 0.25],
				glowColor: [0.0, 0.3, 0.1],

				markers: [],
				opacity: 0.9,
				onRender: (state: any) => {
					state.markers = Array.from(positions.current.values()) as unknown as GlobeMarker[];
					state.phi = phi;
					phi += 0.005;
				},
			});
		};

		create();

		const handleResize = () => {
			// debounce
			if (resizeTimer) window.clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(() => {
				if (!mounted) return;
				create();
			}, 150) as unknown as number;
		};

		window.addEventListener("resize", handleResize);

		// Also observe canvas size changes (more reliable than window resize in some layouts)
		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(handleResize);
			if (canvasRef.current) ro.observe(canvasRef.current);
		}

		return () => {
			mounted = false;
			window.removeEventListener("resize", handleResize);
			if (resizeTimer) window.clearTimeout(resizeTimer);
			if (ro && canvasRef.current) ro.unobserve(canvasRef.current);
			if (globeRef.current && typeof globeRef.current.destroy === "function") {
				try {
					globeRef.current.destroy();
				} catch (e) {
					/* ignore */
				}
				globeRef.current = null;
			}
		};
	}, [canvasRef]);

	return (
		<div className="App" style={{ color: "#00ff41", fontFamily: "monospace" }}>
			<h1>[ SYSTEM_LOCATOR ]</h1>
			{counter !== 0 ? <p>&gt; ONLINE_NODES: {counter}</p> : <p>&gt; SCANNING...</p>}
			<canvas
				ref={canvasRef}
				width={400 * 2}
				height={400 * 2}
				style={{ width: "100%", maxWidth: 400, height: 400, display: "block", marginTop: 12 }}
			/>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
