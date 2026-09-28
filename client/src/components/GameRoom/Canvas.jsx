import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import socket from '../../socket';

/**
 * Canvas – freehand drawing synced across clients via Socket.IO.
 *
 * Props:
 *   color      string   Active stroke color.
 *   brushSize  number   Active stroke width (px).
 *   roomId     string   Current room ID (needed for emitting draw events).
 *
 * Ref handle exposed to parent:
 *   clear(emit?)  — clears the local canvas; when emit=true also emits draw:clear.
 *
 * Socket events emitted:
 *   draw:stroke  {roomId, strokeData}  — one segment per ~16 ms frame (≤60/s).
 *   draw:clear   {roomId}              — when the user presses Clear.
 *
 * Socket events received:
 *   draw:stroke  strokeData            — remote segment; draw without re-emitting.
 *   draw:clear                         — remote clear; clear without re-emitting.
 *   draw:replay  strokeData[]          — late-joiner catch-up; replay all segments.
 */
const Canvas = forwardRef(function Canvas({ color, brushSize, roomId, disabled }, ref) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastEmitPos = useRef({ x: 0, y: 0 });

  // Throttle: track timestamp of last emitted stroke (~60fps = ~16ms)
  const lastEmitTime = useRef(0);
  const EMIT_INTERVAL_MS = 16;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Draw a single segment onto the canvas. Does NOT clear or redraw whole canvas.
   * Directly draws the segment onto existing canvas content using moveTo/lineTo.
   */
  const drawSegment = useCallback(({ x0, y0, x1, y1, color: c, lineWidth }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = c;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }, []);

  /** Clear the canvas. Optionally emit draw:clear to the room. */
  const clearCanvas = useCallback(
    (emit = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      if (emit && roomId) {
        socket.emit('draw:clear', { roomId });
      }
    },
    [roomId]
  );

  // Expose { clear(emit?) } to parent (App.jsx → Toolbar onClear)
  useImperativeHandle(ref, () => ({
    clear(emit = false) {
      clearCanvas(emit);
    },
  }), [clearCanvas]);

  // ── Convert PointerEvent → canvas-local coordinates ───────────────────────
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // Scale from CSS pixels to canvas pixels (canvas may be CSS-scaled down)
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      canvasRef.current.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      lastPos.current = pos;
      lastEmitPos.current = pos;
      lastEmitTime.current = performance.now();
      isDrawing.current = true;

      // Draw initial point/dot locally
      drawSegment({ x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y, color, lineWidth: brushSize });

      // Emit initial point so a single click or tap renders on remote clients
      if (roomId) {
        socket.emit('draw:stroke', {
          roomId,
          strokeData: { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y, color, lineWidth: brushSize },
        });
      }
    },
    [getPos, disabled, drawSegment, color, brushSize, roomId]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (disabled || !isDrawing.current) return;
      e.preventDefault();

      const pos = getPos(e);
      const prev = lastPos.current;

      // Draw locally immediately for responsive feedback
      drawSegment({ x0: prev.x, y0: prev.y, x1: pos.x, y1: pos.y, color, lineWidth: brushSize });
      lastPos.current = pos;

      // Throttled emit: only emit draw:stroke if at least ~16ms has passed (~60fps)
      const now = performance.now();
      if (roomId && now - lastEmitTime.current >= EMIT_INTERVAL_MS) {
        const x0 = lastEmitPos.current.x;
        const y0 = lastEmitPos.current.y;
        const x1 = pos.x;
        const y1 = pos.y;

        // Emit segment from previous emitted point (x0, y0) to current point (x1, y1)
        if (x0 !== x1 || y0 !== y1) {
          socket.emit('draw:stroke', {
            roomId,
            strokeData: { x0, y0, x1, y1, color, lineWidth: brushSize },
          });
          lastEmitPos.current = pos;
          lastEmitTime.current = now;
        }
      }
    },
    [getPos, drawSegment, color, brushSize, roomId, EMIT_INTERVAL_MS, disabled]
  );

  const stopDrawing = useCallback(
    (e) => {
      if (!isDrawing.current) return;

      // Emit any remaining segment between last emitted point and final pointer position
      if (roomId) {
        const x0 = lastEmitPos.current.x;
        const y0 = lastEmitPos.current.y;
        const x1 = lastPos.current.x;
        const y1 = lastPos.current.y;
        if (x0 !== x1 || y0 !== y1) {
          socket.emit('draw:stroke', {
            roomId,
            strokeData: { x0, y0, x1, y1, color, lineWidth: brushSize },
          });
          lastEmitPos.current = lastPos.current;
        }
      }

      isDrawing.current = false;
      if (e?.pointerId && canvasRef.current?.hasPointerCapture?.(e.pointerId)) {
        try {
          canvasRef.current.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    },
    [roomId, color, brushSize]
  );

  // ── Socket listeners (remote events) ──────────────────────────────────────
  useEffect(() => {
    // Confirm socket transport is websocket (not stuck on polling)
    const checkTransport = () => {
      const transportName = socket.io?.engine?.transport?.name;
      console.log(`[Canvas] Socket transport: "${transportName}"`);
    };

    if (socket.connected) {
      checkTransport();
    }
    socket.on('connect', checkTransport);
    socket.io?.engine?.on('upgrade', (transport) => {
      console.log(`[Canvas] Socket transport upgraded to: "${transport.name}"`);
    });

    function onRemoteStroke(strokeData) {
      // Draw single incoming segment directly onto canvas without clearing or full redraw
      drawSegment(strokeData);
    }

    function onRemoteClear() {
      clearCanvas(false); // don't re-emit
    }

    function onReplay(strokes) {
      if (!Array.isArray(strokes)) return;
      console.log(`[Canvas] Replaying ${strokes.length} stroke(s) from server.`);
      strokes.forEach((seg) => drawSegment(seg));
    }

    socket.on('draw:stroke', onRemoteStroke);
    socket.on('draw:clear', onRemoteClear);
    socket.on('draw:replay', onReplay);

    return () => {
      socket.off('connect', checkTransport);
      socket.off('draw:stroke', onRemoteStroke);
      socket.off('draw:clear', onRemoteClear);
      socket.off('draw:replay', onReplay);
    };
  }, [drawSegment, clearCanvas]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        id="drawing-canvas"
        width={800}
        height={600}
        className={`drawing-canvas ${disabled ? 'canvas-disabled' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
        style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
      />
    </div>
  );
});

export default Canvas;
