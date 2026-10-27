import React, { useState } from 'react';
import { X, ExternalLink, Sparkles } from 'lucide-react';

interface FloatingAdBannerProps {
  promotions?: any[];
  services?: any[];
  slogan?: string;
  onSelectService?: (serviceId: number) => void;
}

export const FloatingAdBanner: React.FC<FloatingAdBannerProps> = ({
  promotions = [],
  services = [],
  slogan = '바이브코딩으로 만든 웹서비스들을 탐험해보세요',
  onSelectService,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  // Active floating ad or top active promotion
  const activePromo = promotions.find((p) => p.status === 'active' && p.slot_type === 'floating_ad')
    || promotions.find((p) => p.status === 'active');

  const matchedService = activePromo ? services.find((s) => s.id === Number(activePromo.service_id)) : null;
  const serviceName = matchedService?.name || activePromo?.service_name || (activePromo?.service_id ? `서비스 #${activePromo.service_id}` : '바이브덤프');
  const shortDesc = matchedService?.short_desc || activePromo?.short_desc || slogan;
  const serviceId = activePromo?.service_id ? Number(activePromo.service_id) : (matchedService?.id || null);
  const serviceUrl = matchedService?.url || activePromo?.service_url;

  const handleOpenTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (serviceUrl) {
      window.open(serviceUrl, '_blank', 'noopener,noreferrer');
    } else if (serviceId && onSelectService) {
      onSelectService(serviceId);
    }
  };

  return (
    <aside
      aria-label="스폰서 광고"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF3C4] border-t-2 border-[#0A0A0A] py-1.5 px-4 shadow-[0_-2px_0_#0A0A0A] flex items-center justify-between gap-3 text-xs"
    >
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
        <div
          onClick={handleOpenTarget}
          className="flex items-center gap-2 overflow-hidden truncate cursor-pointer hover:opacity-90"
        >
          {/* Badge: Always '스폰서' */}
          <span className="bg-[#0A0A0A] text-[#FFD23F] text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#FFD23F]" />
            스폰서
          </span>

          {/* [서비스명] 한줄소개 */}
          <span className="font-bold text-[#0A0A0A] truncate">
            <span className="text-[#1F5FD1]">[{serviceName}]</span>{' '}
            <span>{shortDesc}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 바로가기 버튼 */}
          <button
            type="button"
            onClick={handleOpenTarget}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A0A0A] hover:bg-[#FFE066] bg-[#FFD23F] border border-[#0A0A0A] px-2.5 py-0.5 rounded shadow-[1px_1px_0_#0A0A0A] active:translate-x-0.5"
          >
            <span>바로가기</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            title="배너 닫기"
            className="p-1 hover:bg-[#F1F0E8] rounded border border-transparent hover:border-[#0A0A0A] text-[#0A0A0A] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
