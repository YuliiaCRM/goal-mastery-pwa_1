import React, { useEffect, useRef, useState } from 'react';

interface FireworksProps {
  active: boolean;
  onComplete: () => void;
  title?: string;
  message?: string;
  duration?: number;
}

const Fireworks: React.FC<FireworksProps> = ({ active, onComplete, title = "Goal achieved. Well done.", message = "One step closer to 2026 mastery", duration = 5000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showText, setShowText] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) {
      setShowText(false);
      return;
    }

    setShowText(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#ea580c', '#f97316', '#fb923c', '#1e293b', '#64748b', '#ffffff'];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      gravity: number;
      size: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 16;
        this.vy = (Math.random() - 0.5) * 16;
        this.alpha = 1;
        this.color = color;
        this.gravity = 0.2;
        this.size = Math.random() * 3 + 1;
      }

      draw() {
        if (!ctx) return;
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
      }

      update() {
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.01;
      }
    }

    const createFirework = (x: number, y: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 70; i++) {
        particles.push(new Particle(x, y, color));
      }
    };

    const initialBursts = () => {
      createFirework(canvas.width / 2, canvas.height / 2);
      setTimeout(() => active && createFirework(canvas.width * 0.25, canvas.height * 0.4), 300);
      setTimeout(() => active && createFirework(canvas.width * 0.75, canvas.height * 0.4), 600);
    };
    initialBursts();

    let animationId: number;
    const startTime = Date.now();
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.shadowBlur = 0;
      
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        if (Math.random() < 0.06) {
          createFirework(Math.random() * canvas.width, Math.random() * canvas.height * 0.7);
        }
        animationId = requestAnimationFrame(animate);
      } else if (particles.length === 0) {
        handleClose();
      } else {
        animationId = requestAnimationFrame(animate);
      }
    };

    const handleClose = () => {
      setShowText(false);
      onComplete();
    };

    timeoutRef.current = window.setTimeout(handleClose, duration + 500);

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active, onComplete, duration]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in px-4">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none"
      />
      
      {showText && (
        <div className="relative z-[1001] w-full max-w-lg transform-gpu scale-in-center">
          <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-orange-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden text-center">
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-orange-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <button 
              onClick={() => {
                setShowText(false);
                onComplete();
              }}
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all active:scale-90 z-10 border border-slate-100 cursor-pointer"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="text-8xl mb-10 transform-gpu hover:scale-110 transition-transform duration-500 select-none drop-shadow-2xl">
                🏆
              </div>
              
              <div className="space-y-4 mb-10 px-4">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {title}
                </h2>
                <p className="text-orange-600 font-black uppercase tracking-widest text-[11px] md:text-xs">
                  {message}
                </p>
              </div>
              
              <div className="w-full max-w-xs space-y-3">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 animate-progress-shrink" style={{ animationDuration: `${duration}ms` }}></div>
                </div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                  Goal finalized
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-progress-shrink {
          animation: progress-shrink 5s linear forwards;
        }
        .scale-in-center {
          animation: scale-in-center 0.6s cubic-bezier(0.19, 1, 0.22, 1) both;
        }
        @keyframes scale-in-center {
          0% { transform: scale(0.85); opacity: 0; filter: blur(8px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }
      `}</style>
    </div>
  );
};

export default Fireworks;