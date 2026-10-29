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

  // 기본 설정 태그(14개) + 실사용 상위 10개만 자동 계산
  const displayTags = useMemo(() => {
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

    const defaultSet = new Set(DEFAULT_TAG_LIST.map((t) => t.name));
    const baseList: TagItem[] = DEFAULT_TAG_LIST.map((t) => ({
      ...t,
      service_count: liveCounts.get(t.name) || 0,
    }));

    const extraTags: TagItem[] = [];
    const seenExtra = new Set<string>();

    (tags || []).forEach((t) => {
      if (!defaultSet.has(t.name) && !seenExtra.has(t.name)) {
        const count = liveCounts.get(t.name) || 0;
        if (count > 0) {
          seenExtra.add(t.name);
          extraTags.push({ ...t, service_count: count });
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

    extraTags.sort((a, b) => (b.service_count ?? 0) - (a.service_count ?? 0) || a.name.localeCompare(b.name, 'ko'));
    const top10Extra = extraTags.slice(0, 10);

    const combined = [...baseList, ...top10Extra];

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
      }, 1500);
    } catch (err: any) {
      setProposeMessage({ type: 'error', text: err.message || '태그 제안에 실패했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-[#0A0A0A] p-4 shadow-[3px_3px_0_#0A0A0A] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-base text-[#0A0A0A]">태그 탐색</span>
          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="inline-flex items-center gap-1 text-xs text-[#0A0A0A] bg-[#FFD23F] font-bold px-2 py-0.5 rounded border border-[#0A0A0A]"
            >
              <span>#{selectedTag} 해제</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 정렬 및 제안 버튼 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F1F0E8] p-0.5 rounded-lg border border-[#0A0A0A] text-xs font-bold">
            <button
              onClick={() => onTagSortChange('count')}
              className={`px-2.5 py-1 rounded transition-colors ${
                tagSort === 'count' ? 'bg-[#FFD23F] text-[#0A0A0A]' : 'text-[#52525B]'
              }`}
            >
              사용량순
            </button>
            <button
              onClick={() => onTagSortChange('trending')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                tagSort === 'trending' ? 'bg-[#FFD23F] text-[#0A0A0A]' : 'text-[#52525B]'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-[#0A0A0A]" />
              <span>급상승</span>
            </button>
          </div>

          <button
            onClick={() => setIsProposing(!isProposing)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0A0A0A] bg-[#06D6A0] hover:bg-[#06D6A0]/80 px-2.5 py-1 rounded-lg border-2 border-[#0A0A0A] shadow-[1px_1px_0_#0A0A0A] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 태그 제안</span>
          </button>
        </div>
      </div>

      {/* 태그 제안 폼 */}
      {isProposing && (
        <form onSubmit={handlePropose} className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="제안할 태그 이름 (최대 10자)"
              maxLength={10}
              className="flex-1 px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newTagName.trim()}
              className="px-3 py-1.5 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? '확인 중...' : '제안'}
            </button>
            <button
              type="button"
              onClick={() => setIsProposing(false)}
              className="p-1.5 text-[#52525B] hover:text-[#0A0A0A]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#52525B] leading-tight">
            * 제안된 태그는 무단 등록 방지를 위해 운영진 심사를 거쳐 등록됩니다.
          </p>
          {proposeMessage && (
            <p className="text-xs font-bold text-[#0A0A0A]">
              {proposeMessage.text}
            </p>
          )}
        </form>
      )}

      {/* 원래 태그 알약 디자인 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {displayTags.map((tag) => {
          const isSelected = selectedTag === tag.name;
          return (
            <button
              key={tag.id}
              onClick={() => onSelectTag(isSelected ? null : tag.name)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border-2 border-[#0A0A0A] font-bold transition-all ${
                isSelected
                  ? 'bg-[#FF6B9E] text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A]'
                  : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8] shadow-[1px_1px_0_#0A0A0A]'
              }`}
            >
              <span>#{tag.name}</span>
              {tag.recent_growth > 0 && tagSort === 'trending' && (
                <span className="text-[10px] text-[#C81E4B] font-black">+{tag.recent_growth}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
