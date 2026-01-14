
import React, { useState, useRef, useEffect } from 'react';
import { Download, LayoutTemplate, Image as ImageIcon, Type, Palette, Wand2 } from 'lucide-react';
import { useData } from '../context/DataContext';

const Studio: React.FC = () => {
  const { orders } = useData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [template, setTemplate] = useState<'BEFORE_AFTER' | 'PROMO' | 'QUOTE'>('BEFORE_AFTER');
  const [text1, setText1] = useState('Antes');
  const [text2, setText2] = useState('Depois');
  const [promoText, setPromoText] = useState('Promoção Especial -50%');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  
  // Images (Base64)
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);
  
  // Find orders with photos
  const ordersWithPhotos = orders.filter(o => o.photos?.before || o.photos?.after);

  const handleOrderSelect = (orderId: string) => {
      setSelectedOrder(orderId);
      const order = orders.find(o => o.id === orderId);
      if (order?.photos) {
          if (order.photos.before) setImg1(order.photos.before);
          if (order.photos.after) setImg2(order.photos.after);
      }
  };

  const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Reset
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#F3F4F6');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Helper to load image
      const drawImage = (src: string, x: number, y: number, w: number, h: number, label?: string) => {
          const img = new Image();
          img.src = src;
          // We can't really wait for load inside a sync draw function easily in React unless we use effect/state
          // But for base64 from state, it usually loads fast. 
          // For stability in this demo, assume cached or handle async carefully.
          // Since this is a simple "re-render" approach, we rely on the user clicking "Refresh" or automatic effect updates
          if (img.complete) {
               ctx.save();
               // Draw rounded rect clip
               ctx.beginPath();
               ctx.roundRect(x, y, w, h, 20);
               ctx.clip();
               ctx.drawImage(img, x, y, w, h);
               ctx.restore();

               if (label) {
                   ctx.fillStyle = '#F3A421'; // Brand Yellow
                   ctx.beginPath();
                   ctx.roundRect(x + 20, y + 20, 120, 40, 10);
                   ctx.fill();
                   ctx.fillStyle = '#211D49';
                   ctx.font = 'bold 20px Inter, sans-serif';
                   ctx.fillText(label, x + 35, y + 48);
               }
          } else {
              img.onload = () => drawCanvas(); // Redraw when loaded
          }
      };

      if (template === 'BEFORE_AFTER') {
          // Layout: Split Vertical
          if (img1) drawImage(img1, 40, 120, 510, 800, text1);
          else {
              ctx.fillStyle = '#e5e7eb';
              ctx.roundRect(40, 120, 510, 800, 20);
              ctx.fill();
              ctx.fillStyle = '#9ca3af';
              ctx.fillText("Sem Imagem", 200, 500);
          }

          if (img2) drawImage(img2, 570, 120, 510, 800, text2);
          else {
            ctx.fillStyle = '#e5e7eb';
            ctx.roundRect(570, 120, 510, 800, 20);
            ctx.fill();
          }
      } else if (template === 'PROMO') {
          if (img2) drawImage(img2, 40, 120, 1040, 600, '');
          
          // Banner Overlay
          ctx.fillStyle = '#211D49';
          ctx.beginPath();
          ctx.roundRect(40, 750, 1040, 200, 20);
          ctx.fill();
          
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 60px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(promoText, canvas.width/2, 870);
      }

      // Header / Branding
      ctx.fillStyle = '#211D49';
      ctx.font = '900 60px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText("MAIS PALMA", 40, 80);
      
      ctx.fillStyle = '#F3A421';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText("LIMPEZA & HIGIENIZAÇÃO", 40, 110); // Subtitle

      // Footer
      ctx.fillStyle = '#211D49';
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px Inter';
      ctx.textAlign = 'center';
      ctx.fillText("📞 923 591 743  •  @maispalma", canvas.width / 2, canvas.height - 30);
  };

  useEffect(() => {
      // Trigger a draw when deps change
      // Short timeout to ensure font loading/image decoding
      const t = setTimeout(drawCanvas, 100);
      return () => clearTimeout(t);
  }, [template, text1, text2, promoText, img1, img2]);

  const downloadImage = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `mais_palma_post_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-3 mb-6 bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-soft border border-white/50 sticky top-0 z-20">
         <div className="w-12 h-12 bg-gradient-premium text-[#211D49] rounded-2xl flex items-center justify-center shadow-glow">
             <Wand2 size={24} />
         </div>
         <div>
            <h2 className="text-2xl font-black text-brand-text tracking-tight">Estúdio</h2>
            <p className="text-xs text-brand-muted font-bold uppercase tracking-wide">
                Marketing Automático
            </p>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-6">
              {/* Template Selector */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                  <h3 className="font-bold text-brand-text mb-4 flex items-center gap-2">
                      <LayoutTemplate size={18} className="text-brand-yellow"/> Modelo
                  </h3>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setTemplate('BEFORE_AFTER')}
                        className={`flex-1 py-3 rounded-xl font-bold text-xs transition border-2 ${template === 'BEFORE_AFTER' ? 'border-brand-yellow bg-yellow-50 text-[#211D49]' : 'border-transparent bg-gray-50 text-gray-500'}`}
                      >
                          Antes & Depois
                      </button>
                      <button 
                        onClick={() => setTemplate('PROMO')}
                        className={`flex-1 py-3 rounded-xl font-bold text-xs transition border-2 ${template === 'PROMO' ? 'border-brand-yellow bg-yellow-50 text-[#211D49]' : 'border-transparent bg-gray-50 text-gray-500'}`}
                      >
                          Promoção
                      </button>
                  </div>
              </div>

              {/* Image Source */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                  <h3 className="font-bold text-brand-text mb-4 flex items-center gap-2">
                      <ImageIcon size={18} className="text-brand-yellow"/> Imagens
                  </h3>
                  
                  {ordersWithPhotos.length > 0 ? (
                      <div className="mb-4">
                          <label className="text-[10px] font-bold text-brand-muted uppercase block mb-2">Importar de Serviço</label>
                          <select 
                            className="w-full p-3 bg-gray-50 rounded-xl text-sm font-medium border-0 outline-none focus:ring-2 focus:ring-brand-yellow"
                            value={selectedOrder}
                            onChange={(e) => handleOrderSelect(e.target.value)}
                          >
                              <option value="">Selecione um serviço...</option>
                              {ordersWithPhotos.map(o => (
                                  <option key={o.id} value={o.id}>{o.clientName} - {o.date}</option>
                              ))}
                          </select>
                      </div>
                  ) : (
                      <div className="text-xs text-orange-500 bg-orange-50 p-3 rounded-xl mb-4 font-bold">
                          Adicione fotos na aba Clientes para usar aqui!
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                      <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-brand-yellow transition">
                           {img1 ? (
                               <img src={img1} className="w-full h-full object-cover" />
                           ) : <span className="text-xs font-bold text-gray-400">Img 1</span>}
                           <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                               const file = e.target.files?.[0];
                               if(file) {
                                   const reader = new FileReader();
                                   reader.onload = ev => setImg1(ev.target?.result as string);
                                   reader.readAsDataURL(file);
                               }
                           }} />
                      </div>
                      <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-brand-yellow transition">
                           {img2 ? (
                               <img src={img2} className="w-full h-full object-cover" />
                           ) : <span className="text-xs font-bold text-gray-400">Img 2</span>}
                           <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                               const file = e.target.files?.[0];
                               if(file) {
                                   const reader = new FileReader();
                                   reader.onload = ev => setImg2(ev.target?.result as string);
                                   reader.readAsDataURL(file);
                               }
                           }} />
                      </div>
                  </div>
              </div>

              {/* Text Config */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                  <h3 className="font-bold text-brand-text mb-4 flex items-center gap-2">
                      <Type size={18} className="text-brand-yellow"/> Textos
                  </h3>
                  
                  {template === 'BEFORE_AFTER' ? (
                      <div className="flex gap-3">
                          <input className="flex-1 p-3 bg-gray-50 rounded-xl text-sm font-bold" value={text1} onChange={e => setText1(e.target.value)} />
                          <input className="flex-1 p-3 bg-gray-50 rounded-xl text-sm font-bold" value={text2} onChange={e => setText2(e.target.value)} />
                      </div>
                  ) : (
                      <input className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold" value={promoText} onChange={e => setPromoText(e.target.value)} />
                  )}
              </div>
              
              <button 
                onClick={downloadImage}
                className="w-full py-4 bg-brand-yellow text-[#211D49] rounded-2xl font-black shadow-glow hover:scale-[1.02] transition flex items-center justify-center gap-2"
              >
                  <Download size={20} /> BAIXAR POST
              </button>
          </div>

          {/* Preview Canvas */}
          <div className="bg-gray-100 rounded-[2.5rem] p-6 shadow-inner flex items-center justify-center overflow-hidden">
               <div className="relative shadow-2xl rounded-sm overflow-hidden" style={{ width: '320px', height: '320px' }}>
                   {/* We scale the visual representation down with CSS, but the canvas is high res */}
                   <canvas 
                      ref={canvasRef} 
                      width={1080} 
                      height={1080} 
                      className="w-full h-full object-contain bg-white"
                   />
               </div>
          </div>
      </div>
    </div>
  );
};

export default Studio;
