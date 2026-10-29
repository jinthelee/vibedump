import React, { useState, useMemo } from 'react';
import { TagItem, Service } from '../types';
import { TrendingUp, Plus, X } from 'lucide-react';
import { suggestTag } from '../lib/api';

interface TagExplorerProps {
  tags: TagItem[];
  services?: Service[];
  selectedTag: string | null;
  onSelectTag: (tagName: string | null) => void;
  onTagCreated?: () => void;
  tagSort: 'count' | 'trending' | 'name';
  onTagSortChange: (sort: 'count' | 'trending' | 'name') => void;
}

const DEFAULT_TAG_LIST: TagItem[] = [
  '웹앱', '웹게임', '글쓰기', '기록', '대시보드', '디자인', '템플릿',
  '메모', '분석', '생산성', 'AI챗', '시각화', '자동화', '협업'
].map((name, index) => ({
  id: index + 1,
  name,
  normalized_name: name.toLowerCase(),
  service_count: 0,
  recent_growth: 0,
  created_at: new Date().toISOString()
}));

export const TagExplorer: React.FC<TagExplorerProps> = ({
  tags,
  services,
  selectedTag,
  onSelectTag,
  onTagCreated,
  tagSort,
  onTagSortChange
}) => {
  const [isProposing, setIsProposing] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [proposeMessage, setProposeMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic tags: 기본 설정 태그(14개) + 실사용 상위 10개만 노출
  const displayTags = useMemo(() => {
    // 1. 실제로 등록된 서비스들로부터 실시간 태그 사용량 계산
    const liveCounts = new Map<string, number>();
    if (Array.isArray(services) && services.length > 0) {
      services.forEach((s) => {
        if (Array.isArray(s.tags)) {
          s.tags.forEach((raw) => {
            const t = String(raw).trim();
            if (t) liveCounts.set(t, (liveCounts.get(t) || 0) + 1);
          });
        }
      });
    }

    // 2. 기본 설정 태그 14개
    const defaultSet = new Set(DEFAULT_TAG_LIST.map((t) => t.name));
    const baseList: TagItem[] = DEFAULT_TAG_LIST.map((t) => ({
      ...t,
      service_count: liveCounts.get(t.name) || 0,
    }));

    // 3. 기본 태그 외 실사용 태그(개수 > 0)만 수집 (삭제/병합된 0개 태그 제외)
    const extraTags: TagItem[] = [];
    const seenExtra = new Set<string>();

    (tags || []).forEach((t) => {
      if (!defaultSet.has(t.name) && !seenExtra.has(t.name)) {
        const count = liveCounts.get(t.name) || 0;
        if (count > 0) {
          seenExtra.add(t.name);
          extraTags.push({
            ...t,
            service_count: count,
          });
        }
      }
    });

    liveCounts.forEach((count, name) => {
      if (count > 0 && !defaultSet.has(name) && !seenExtra.has(name)) {
        seenExtra.add(name);
        extraTags.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          name,
          normalized_name: name.toLowerCase(),
          service_count: count,
          recent_growth: 1,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 4. 추가 태그 중 사용량 많은 순으로 정렬 후 상위 10개만 추출
    extraTags.sort((a, b) => (b.service_count ?? 0) - (a.service_count ?? 0) || a.name.localeCompare(b.name, 'ko'));
    const top10Extra = extraTags.slice(0, 10);

    // 5. 기본 태그 14개 + 상위 10개 결합
    const combined = [...baseList, ...top10Extra];

    // 현재 사용자가 선택한 태그가 목록 밖이어도 선택 해제할 수 있도록 유지
    if (selectedTag && !combined.some((t) => t.name === selectedTag)) {
      combined.push({
        id: Date.now(),
        name: selectedTag,
        normalized_name: selectedTag.toLowerCase(),
        service_count: liveCounts.get(selectedTag) || 0,
        recent_growth: 0,
        created_at: new Date().toISOString(),
      });
    }

    return combined;
  }, [tags, services, selectedTag]);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagName.trim();
    if (!clean) return;
    if (clean.length > 10) {
      setProposeMessage({ type: 'error', text: '태그는 최대 10자까지만 입력 가능합니다.' });
      return;
    }

    setIsSubmitting(true);
    setProposeMessage(null);
    try {
      const res = await suggestTag(clean);
      if (res.match_type === 'exact') {
        setProposeMessage({ type: 'info', text: `이미 등록된 태그 '#${res.tag.name}'(으)로 즉시 필터링합니다.` });
        onSelectTag(res.tag.name);
      } else {
        setProposeMessage({ type: 'success', text: `새 태그 '#${res.tag.name}' 제안이 접수되었습니다! 운영진 심사 후 정식 공개 태그로 등록됩니다.` });
        onTagCreated?.();
      }
      setTimeout(() => {
        setIsProposing(false);
        setNewTagName('');
        setProposeMessage(null);
      }, 2000);
    } catch (err: any) {
      setProposeMessage({ type: 'error', text: err.message || '태그 제안에 실패했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-3 border-[#0A0A0A] p-4 shadow-[4px_4px_0px_0px_#0A0A0A] mb-8">
      {/* Upper Bar: Title & Propose Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FF6B6B]" />
          <h2 className="text-base font-black text-[#0A0A0A] tracking-wider uppercase">
            태그 탐색
          </h2>
          <span className="text-xs font-bold text-[#666666]">
            (기본 14종 + 실사용 TOP 10)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#FF6B6B] text-white border-2 border-[#0A0A0A] shadow-[2px_2px_0px_0px_#0A0A0A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <X className="w-3.5 h-3.5" />
              필터 초기화
            </button>
          )}

          <button
            onClick={() => setIsProposing(!isProposing)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black bg-[#FFD23F] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[2px_2px_0px_0px_#0A0A0A] hover:bg-[#FFE066] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            태그 제안
          </button>
        </div>
      </div>

      {/* Propose Tag Form */}
      {isProposing && (
        <form onSubmit={handlePropose} className="mb-4 p-3 bg-white border-2 border-[#0A0A0A] shadow-[2px_2px_0px_0px_#0A0A0A]">
          <div className="text-xs font-bold text-[#0A0A0A] mb-2">
            💡 찾으시는 태그가 없나요? 새로운 태그를 제안해 보세요 (최대 10자).
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              maxLength={10}
              placeholder="제안할 태그 이름 (최대 10자)"
              className="flex-1 px-3 py-1.5 text-xs font-bold border-2 border-[#0A0A0A] focus:outline-none focus:bg-[#FFE066]/20"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newTagName.trim()}
              className="px-4 py-1.5 text-xs font-black bg-[#4ECDC4] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[2px_2px_0px_0px_#0A0A0A] disabled:opacity-50 hover:bg-[#3db8af] transition-colors"
            >
              {isSubmitting ? '접수 중...' : '제안하기'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProposing(false);
                setNewTagName('');
                setProposeMessage(null);
              }}
              className="px-2.5 py-1.5 text-xs font-bold bg-[#E8E4DD] text-[#0A0A0A] border-2 border-[#0A0A0A]"
            >
              취소
            </button>
          </div>
          {proposeMessage && (
            <div
              className={`mt-2 text-xs font-bold p-2 border-2 border-[#0A0A0A] ${
                proposeMessage.type === 'success'
                  ? 'bg-[#4ECDC4]/20 text-[#0A0A0A]'
                  : proposeMessage.type === 'info'
                  ? 'bg-[#FFD23F]/20 text-[#0A0A0A]'
                  : 'bg-[#FF6B6B]/20 text-[#FF6B6B]'
              }`}
            >
              {proposeMessage.text}
            </div>
          )}
        </form>
      )}

      {/* Tag Pills List */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectTag(null)}
          className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all border-2 border-[#0A0A0A] ${
            selectedTag === null
              ? 'bg-[#0A0A0A] text-white shadow-[2px_2px_0px_0px_#FFD23F] translate-x-0.5 translate-y-0.5'
              : 'bg-white text-[#0A0A0A] shadow-[2px_2px_0px_0px_#0A0A0A] hover:bg-[#FFE066] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'
          }`}
        >
          전체
        </button>

        {displayTags.map((tag) => {
          const isSelected = selectedTag === tag.name;

          return (
            <button
              key={`${tag.id}-${tag.name}`}
              onClick={() => onSelectTag(isSelected ? null : tag.name)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all border-2 border-[#0A0A0A] ${
                isSelected
                  ? 'bg-[#FFD23F] text-[#0A0A0A] font-black shadow-[2px_2px_0px_0px_#0A0A0A] translate-x-0.5 translate-y-0.5'
                  : 'bg-white text-[#0A0A0A] shadow-[2px_2px_0px_0px_#0A0A0A] hover:bg-[#FFE066] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'
              }`}
            >
              <span>#{tag.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
