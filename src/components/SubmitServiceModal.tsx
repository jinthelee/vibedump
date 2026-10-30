import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Copy, AlertCircle, Sparkles, Mail, ExternalLink, Plus, RotateCcw, HelpCircle } from 'lucide-react';
import { createService, getImagePosition, cleanImageUrl } from '../lib/api';
import { VALID_CATEGORIES } from '../types';

interface SubmitServiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableCategories?: string[];
}

const DRAFT_STORAGE_KEY = 'vibedump_service_submit_draft';

// Operator requested 14 base priority tags
const PRESET_BASE_TAGS = [
  '웹앱', '웹게임', '글쓰기', '기록', '대시보드', '디자인', '템플릿',
  '메모', '분석', '생산성', 'AI챗', '시각화', '자동화', '협업'
];

// Rich dictionary for auto-complete tag suggestions (prioritizing operator requested 14 tags)
const POPULAR_TAG_SUGGESTIONS = [
  ...PRESET_BASE_TAGS,
  'AI', '챗봇', '생성', '프로토타입', '게임', '사주타로', '운세',
  '밈', '짤방', '덕질', '소셜', '커뮤니티', '유틸리티'
];

export const SubmitServiceModal: React.FC<SubmitServiceModalProps> = ({ onClose, onSuccess, availableCategories }) => {
  const categoryList = (availableCategories && availableCategories.length > 0) ? availableCategories : VALID_CATEGORIES;

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');

  // Category selection or new proposal
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>(categoryList[0] || '생산성');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [makerName, setMakerName] = useState('');
  const [makerEmail, setMakerEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ maker_code: string; service_id: number; is_custom?: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftSavedNotice, setDraftSavedNotice] = useState(false);
  const [showExample, setShowExample] = useState(false);

  // Requirement 4: Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.name || draft.url || draft.shortDesc || draft.description) {
          if (draft.name) setName(draft.name);
          if (draft.url) setUrl(draft.url);
          if (draft.shortDesc) setShortDesc(draft.shortDesc);
          if (draft.description) setDescription(draft.description);
          if (draft.selectedCategoryOption) setSelectedCategoryOption(draft.selectedCategoryOption);
          if (draft.customCategoryInput) setCustomCategoryInput(draft.customCategoryInput);
          if (Array.isArray(draft.tags) && draft.tags.length > 0) setTags(draft.tags);
          if (draft.thumbnailUrl) setThumbnailUrl(draft.thumbnailUrl);
          if (draft.makerName) setMakerName(draft.makerName);
          if (draft.makerEmail) setMakerEmail(draft.makerEmail);
          setHasRestoredDraft(true);
        }
      }
    } catch (e) {
      console.warn('Failed to restore draft', e);
    }
  }, []);

  // Requirement 4: Save draft to localStorage automatically
  useEffect(() => {
    if (successData) return;
    try {
      const draft = {
        name,
        url,
        shortDesc,
        description,
        selectedCategoryOption,
        customCategoryInput,
        tags,
        thumbnailUrl,
        makerName,
        makerEmail
      };
      // Only save if at least one meaningful field has content
      if (name || url || shortDesc || description || customCategoryInput) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
    } catch (e) {
      console.warn('Failed to save draft', e);
    }
  }, [name, url, shortDesc, description, selectedCategoryOption, customCategoryInput, tags, thumbnailUrl, makerName, makerEmail, successData]);

  const handleManualSaveDraft = () => {
    try {
      const draft = {
        name,
        url,
        shortDesc,
        description,
        selectedCategoryOption,
        customCategoryInput,
        tags,
        thumbnailUrl,
        makerName,
        makerEmail,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftSavedNotice(true);
      setTimeout(() => setDraftSavedNotice(false), 3000);
    } catch (e) {
      console.warn('Failed to save draft', e);
    }
  };

  const handleSafeClose = () => {
    try {
      if (name || url || shortDesc || description || customCategoryInput) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            name,
            url,
            shortDesc,
            description,
            selectedCategoryOption,
            customCategoryInput,
            tags,
            thumbnailUrl,
            makerName,
            makerEmail,
          })
        );
      }
    } catch {}
    onClose();
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setName('');
    setUrl('');
    setShortDesc('');
    setDescription('');
    setSelectedCategoryOption('AI');
    setCustomCategoryInput('');
    setTags(['웹앱', 'AI']);
    setThumbnailUrl('');
    setMakerName('');
    setMakerEmail('');
    setHasRestoredDraft(false);
  };

  // Auto-complete tag filtering
  const matchingSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!q) return [];
    return POPULAR_TAG_SUGGESTIONS.filter(
      (t) => t.toLowerCase().includes(q) && !tags.includes(t)
    ).slice(0, 6);
  }, [tagInput, tags]);

  const handleAddTag = (tagToAdd?: string) => {
    const clean = (tagToAdd || tagInput).trim().replace(/^#/, '');
    if (!clean) return;
    if (clean.length > 10) {
      setErrorMessage('태그는 최대 10자까지만 입력 가능합니다.');
      return;
    }
    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 5) {
      setErrorMessage('주요 기능 태그는 최대 5개까지만 등록 가능합니다.');
      return;
    }
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) return setErrorMessage('사이트명을 입력해주세요.');
    if (!url.trim()) return setErrorMessage('접속 주소(URL)를 입력해주세요.');
    if (!shortDesc.trim()) return setErrorMessage('한 줄 소개를 입력해주세요.');
    if (!description.trim()) return setErrorMessage('상세 설명을 입력해주세요.');
    if (tags.length === 0) return setErrorMessage('주요 태그를 1개 이상 추가해주세요.');

    try {
      new URL(url.trim());
    } catch {
      return setErrorMessage('유효한 웹사이트 주소(http:// 또는 https://)를 입력해주세요.');
    }

    // Determine final category (custom proposed or selected)
    let finalCategory = selectedCategoryOption;
    if (selectedCategoryOption === '__custom__') {
      const customClean = customCategoryInput.trim();
      if (!customClean) {
        return setErrorMessage('제안할 새 카테고리명을 입력해주세요.');
      }
      finalCategory = customClean;
    }

    setIsSubmitting(true);
    try {
      const res = await createService({
        name: name.trim(),
        url: url.trim(),
        short_desc: shortDesc.trim(),
        description: description.trim(),
        category: finalCategory,
        tags,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        screenshot_url: screenshotUrl.trim() || thumbnailUrl.trim() || undefined,
        maker_name: makerName.trim() || undefined,
        maker_email: makerEmail.trim() || undefined,
        is_custom_category: selectedCategoryOption === '__custom__',
      });

      // Clear draft on success
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      const isCustom = selectedCategoryOption === '__custom__';
      setSuccessData({
        maker_code: res.maker_code,
        service_id: res.service_id,
        is_custom: isCustom,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || '서비스 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (successData?.maker_code) {
      navigator.clipboard.writeText(successData.maker_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-[#0A0A0A] flex items-center justify-between bg-[#FF6B9E]">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-[#0A0A0A]">사이트 등록</span>
            <span className="text-[11px] font-mono bg-white text-[#0A0A0A] px-2 py-0.5 rounded border border-[#0A0A0A] font-bold">
              SUBMIT SERVICE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExample(true)}
              className="px-2.5 py-1 text-xs font-bold bg-[#FFD23F] hover:bg-[#FFE066] text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg shadow-[1px_1px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
              title="어떻게 작성해야 할지 감이 안 올 때 참고할 수 있는 등록 예시 팝업을 엽니다 (입력 중인 내용은 그대로 유지됩니다)"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>예시 보기</span>
            </button>
            <button
              onClick={handleSafeClose}
              className="p-1.5 bg-white border border-[#0A0A0A] rounded text-[#0A0A0A] hover:bg-[#F1F0E8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto bg-white">
          {successData ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#0A0A0A]">
                <Check className="w-8 h-8 stroke-[3] text-[#0A0A0A]" />
              </div>

              <div className="space-y-1">
                {successData.is_custom ? (
                  <>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                      심사 대기 · 사이트 ID: #{successData.service_id}
                    </span>
                    <h3 className="font-display text-2xl text-[#0A0A0A] pt-1">
                      사이트가 심사 대기 중입니다!
                    </h3>
                    <p className="text-xs text-[#52525B] max-w-md mx-auto leading-relaxed">
                      아래 발급된 <strong>사이트 관리 코드</strong>는 [사이트 관리] 메뉴에서 사이트 수정, 삭제 및 공지 작성에 필요하므로 반드시 복사해 안전하게 보관하세요.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono font-bold text-[#52525B]">
                      등록 완료 · 사이트 ID: #{successData.service_id}
                    </span>
                    <h3 className="font-display text-2xl text-[#0A0A0A] pt-1">
                      사이트가 등록되었습니다!
                    </h3>
                    <p className="text-xs text-[#52525B] max-w-md mx-auto leading-relaxed">
                      바이브덤프 둘러보기 피드에 즉시 공개되었습니다. 아래 발급된 <strong>사이트 관리 코드</strong>는 [사이트 관리] 메뉴에서 사이트 수정, 삭제 및 공지 작성에 필요하므로 반드시 복사해 안전하게 보관하세요.
                    </p>
                  </>
                )}
              </div>

              {/* Secure Site Management Code Card */}
              <div className="max-w-md mx-auto p-4 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-left space-y-2 shadow-[3px_3px_0_#0A0A0A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A0A0A] flex items-center gap-1.5">
                    🔑 사이트 관리 코드
                  </span>
                  <span className="text-[10px] bg-[#C81E4B] text-white px-1.5 py-0.5 rounded font-black">
                    재발급 불가
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={successData.maker_code}
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white border-2 border-[#0A0A0A] rounded-lg select-all"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 bg-[#FFD23F] hover:bg-[#FFD23F]/80 text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg text-xs font-bold flex items-center gap-1 shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>코드 복사</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#52525B]">
                  * [사이트 관리] 메뉴에서 사이트 수정, 삭제, 공지 작성 시 이 코드를 입력하여 인증합니다.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#0A0A0A] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg shadow-[2px_2px_0_#FFD23F]"
                >
                  확인하고 사이트 둘러보기
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Draft Restored Banner */}
              {hasRestoredDraft && (
                <div className="p-2.5 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-center justify-between text-xs text-[#0A0A0A]">
                  <span className="font-medium flex items-center gap-1.5">
                    💾 <strong>임시 저장 안내:</strong> 작성 중이던 내용이 브라우저에서 자동 복원되었습니다.
                  </span>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#0A0A0A] rounded font-bold hover:bg-neutral-100"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 text-[#C81E4B] font-bold text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Promo banner: sponsor guide */}
              <div className="p-3.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl flex items-center justify-between gap-3 text-xs shadow-[2px_2px_0_#0A0A0A]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#0A0A0A]">
                    <span className="bg-[#0A0A0A] text-[#FFD23F] px-1.5 py-0.2 rounded text-[10px] font-black uppercase">
                      PROMO
                    </span>
                    <span>유료 추천 노출 및 스폰서 배지 안내</span>
                  </div>
                  <p className="text-[11px] text-[#52525B] font-medium leading-relaxed">
                    무료 서버가 못 버티겠다고 할 때 생각해 보겠습니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    사이트명 <span className="text-[#C81E4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 던전 크롤러: 포션 마스터"
                    maxLength={80}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    접속 주소(URL) <span className="text-[#C81E4B]">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Requirement 4 & 11: Representative Category selection + Custom Category proposal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                  <span>대표 카테고리 <span className="text-[#C81E4B]">*</span></span>
                  <span className="text-[11px] text-[#52525B] font-normal">
                    * 원하는 카테고리가 없다면 직접 제안할 수 있습니다.
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedCategoryOption}
                    onChange={(e) => setSelectedCategoryOption(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  >
                    {categoryList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__custom__">➕ [새 카테고리 직접 입력/제안]</option>
                  </select>

                  {selectedCategoryOption === '__custom__' && (
                    <input
                      type="text"
                      required
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="제안할 카테고리명 (예: 오디오, 커머스, 운세)"
                      maxLength={20}
                      className="w-full px-3 py-2 text-xs bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg focus:outline-none font-bold"
                    />
                  )}
                </div>

                {selectedCategoryOption === '__custom__' && (
                  <div className="p-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-[11px] text-[#52525B] leading-tight">
                    📢 <strong>새 카테고리 제안 안내:</strong> 제안하신 카테고리는 운영진의 심사를 거쳐 최종 승인 및 정규 분류에 반영됩니다.
                  </div>
                )}
              </div>

              {/* Major functional tags with auto-complete and recommendations */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                  <span>주요 기능 태그 (최대 5개) <span className="text-[#C81E4B]">*</span></span>
                  <span className="text-[11px] text-[#52525B] font-normal">{tags.length}/5개 선택</span>
                </label>

                <div className="relative">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      maxLength={10}
                      placeholder="태그 입력 (최대 10자, 엔터로 추가)"
                      className="flex-1 px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag()}
                      className="px-3.5 py-2 text-xs font-bold bg-[#F1F0E8] border-2 border-[#0A0A0A] rounded-lg hover:bg-[#FFD23F] active:translate-x-0.5"
                    >
                      추가
                    </button>
                  </div>

                  {/* Auto-complete dropdown */}
                  {matchingSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-[#0A0A0A] rounded-lg p-1.5 shadow-[3px_3px_0_#0A0A0A] z-20 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[#52525B] font-bold px-1.5">추천 태그:</span>
                      {matchingSuggestions.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleAddTag(st)}
                          className="px-2 py-0.5 bg-[#FFF3C4] border border-[#0A0A0A] rounded text-[11px] font-bold text-[#0A0A0A] hover:bg-[#FFD23F] flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>#{st}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected tag chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 min-h-[30px]">
                  {tags.length === 0 ? (
                    <span className="text-[11px] text-[#52525B] italic">
                      아직 추가된 태그가 없습니다. 아래 기본 분류를 클릭하거나 직접 입력해주세요.
                    </span>
                  ) : (
                    tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-[#FFD23F] border-2 border-[#0A0A0A] px-2.5 py-1 rounded text-xs font-black shadow-[1px_1px_0_#0A0A0A]"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-[#0A0A0A] hover:text-[#C81E4B] font-black ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Clickable base tag presets */}
                <div className="pt-2 space-y-1.5 bg-[#F8F7F2] p-2.5 rounded-lg border border-[#0A0A0A]/30">
                  <div className="text-[11px] font-bold text-[#0A0A0A] flex items-center justify-between">
                    <span>💡 기본 분류 태그 (클릭하여 선택/해제):</span>
                    <span className="font-mono text-[10px] text-[#52525B]">선택 {tags.length}/5</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_BASE_TAGS.map((pt) => {
                      const isSelected = tags.includes(pt);
                      return (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveTag(pt);
                            } else {
                              if (tags.length >= 5) {
                                setErrorMessage('주요 기능 태그는 최대 5개까지만 등록 가능합니다.');
                                return;
                              }
                              setTags([...tags, pt]);
                              setErrorMessage(null);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded-md border-2 border-[#0A0A0A] font-bold transition-all shadow-[1px_1px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 ${
                            isSelected
                              ? 'bg-[#FFD23F] text-[#0A0A0A] font-black'
                              : 'bg-white text-[#52525B] hover:text-[#0A0A0A] hover:bg-[#FFF3C4]'
                          }`}
                        >
                          {isSelected ? `✓ #${pt}` : `+ #${pt}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0A0A0A]">
                  한 줄 소개 <span className="text-[#C81E4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  placeholder="서비스의 핵심 매력을 한 줄로 요약해주세요 (최대 150자)"
                  maxLength={150}
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0A0A0A]">
                  상세 설명 <span className="text-[#C81E4B]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="바이브 코딩 제작 계기, 구현한 기능과 재미 요소를 자유롭게 소개해주세요."
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                />
              </div>

              {/* Image URLs with live crop focal point selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                    <span>대표 썸네일 이미지 URL (선택)</span>
                    <span className="text-[10px] text-[#52525B]">16:10 카드 비율</span>
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... (웹상에 공개된 이미지 주소)"
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  {thumbnailUrl && (
                    <div className="mt-1.5 p-2.5 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-24 sm:w-28 aspect-[16/10] rounded overflow-hidden border border-[#0A0A0A] bg-[#F1F0E8] shrink-0 shadow-[1px_1px_0_#0A0A0A]">
                          <img
                            src={cleanImageUrl(thumbnailUrl)}
                            alt="썸네일 미리보기"
                            referrerPolicy="no-referrer"
                            style={{ objectPosition: getImagePosition(thumbnailUrl) }}
                            className="w-full h-full object-cover transition-all"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-[#52525B] flex-1">
                          <span className="font-bold text-[#0A0A0A] block">✂️ 노출 크롭 기준</span>
                          <span className="text-[10px]">웹사이트 캡처 시 헤더가 보이도록 상단 크롭을 추천합니다.</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-200">
                        <span className="text-[10px] font-bold text-[#0A0A0A] shrink-0">크롭 위치:</span>
                        {[
                          { id: 'top', label: '🔼 상단 (헤더)' },
                          { id: 'center', label: '⏺️ 중앙' },
                          { id: 'bottom', label: '🔽 하단' },
                        ].map((pos) => {
                          const currentPos = thumbnailUrl.includes('#pos=') ? (thumbnailUrl.match(/#pos=([a-z0-9%_-]+)/i)?.[1] || 'center') : 'center';
                          const isActive = currentPos === pos.id;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => {
                                const clean = cleanImageUrl(thumbnailUrl).trim();
                                if (!clean) return;
                                setThumbnailUrl(pos.id === 'center' ? clean : `${clean}#pos=${pos.id}`);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                isActive
                                  ? 'bg-[#FFD23F] border-[#0A0A0A] text-[#0A0A0A] shadow-[1px_1px_0_#0A0A0A]'
                                  : 'bg-white border-neutral-300 text-[#52525B] hover:text-[#0A0A0A]'
                              }`}
                            >
                              {pos.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                    <span>추가 스크린샷 이미지 URL (선택)</span>
                    <span className="text-[10px] text-[#52525B]">상세 모달 노출용</span>
                  </label>
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://... (상세 팝업용 스크린샷 주소)"
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  {screenshotUrl && (
                    <div className="mt-1.5 p-2.5 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-24 sm:w-28 aspect-[16/10] rounded overflow-hidden border border-[#0A0A0A] bg-[#F1F0E8] shrink-0 shadow-[1px_1px_0_#0A0A0A]">
                          <img
                            src={cleanImageUrl(screenshotUrl)}
                            alt="스크린샷 미리보기"
                            referrerPolicy="no-referrer"
                            style={{ objectPosition: getImagePosition(screenshotUrl) }}
                            className="w-full h-full object-cover transition-all"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-[#52525B] flex-1">
                          <span className="font-bold text-[#0A0A0A] block">✂️ 노출 크롭 기준</span>
                          <span className="text-[10px]">상세 모달에서 노출될 이미지의 초점을 맞춥니다.</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-200">
                        <span className="text-[10px] font-bold text-[#0A0A0A] shrink-0">크롭 위치:</span>
                        {[
                          { id: 'top', label: '🔼 상단 (헤더)' },
                          { id: 'center', label: '⏺️ 중앙' },
                          { id: 'bottom', label: '🔽 하단' },
                        ].map((pos) => {
                          const currentPos = screenshotUrl.includes('#pos=') ? (screenshotUrl.match(/#pos=([a-z0-9%_-]+)/i)?.[1] || 'center') : 'center';
                          const isActive = currentPos === pos.id;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => {
                                const clean = cleanImageUrl(screenshotUrl).trim();
                                if (!clean) return;
                                setScreenshotUrl(pos.id === 'center' ? clean : `${clean}#pos=${pos.id}`);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                isActive
                                  ? 'bg-[#FFD23F] border-[#0A0A0A] text-[#0A0A0A] shadow-[1px_1px_0_#0A0A0A]'
                                  : 'bg-white border-neutral-300 text-[#52525B] hover:text-[#0A0A0A]'
                              }`}
                            >
                              {pos.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Maker Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t-2 border-[#0A0A0A]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    제작자 / 팀 닉네임 (선택)
                  </label>
                  <input
                    type="text"
                    value={makerName}
                    onChange={(e) => setMakerName(e.target.value)}
                    placeholder="예: 덤퍼개발자, 1인인디팀 (최대 30자)"
                    maxLength={30}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                    <span>제작자 연락처 (선택 사항)</span>
                    <span className="text-[10px] text-[#0F7B5F] font-bold">생략 가능</span>
                  </label>
                  <input
                    type="text"
                    value={makerEmail}
                    onChange={(e) => setMakerEmail(e.target.value)}
                    placeholder="생략 가능 (원하실 때만 X 계정, 오픈채팅, 이메일 등 자유 입력)"
                    maxLength={100}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  <p className="text-[11px] text-[#52525B]">
                    * 개인정보 보호를 위해 비워두셔도 되며, 사이트 관리 코드로 언제든 사이트 수정·삭제가 가능합니다.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-[#0A0A0A] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] text-[#52525B]">
                    * 작성 중 언제든 임시저장하거나 복원할 수 있습니다.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSafeClose}
                    className="px-4 py-2 text-xs font-bold text-[#52525B] hover:text-[#0A0A0A]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSaveDraft}
                    className={`px-3.5 py-2 text-xs font-bold border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 ${
                      draftSavedNotice
                        ? 'bg-[#06D6A0] text-[#0A0A0A]'
                        : 'bg-[#F1F0E8] hover:bg-[#FFF3C4] text-[#0A0A0A]'
                    }`}
                  >
                    {draftSavedNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>임시저장 완료!</span>
                      </>
                    ) : (
                      <>
                        <span>💾 임시저장</span>
                      </>
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? '등록 중...' : '등록 신청하기'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Example Preview Modal Popover */}
      {showExample && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-xl border-3 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3.5 bg-[#FFD23F] border-b-2 border-[#0A0A0A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-base text-[#0A0A0A]">사이트 등록 작성 예시</span>
                <span className="text-[10px] font-bold bg-white text-[#0A0A0A] px-2 py-0.5 rounded border border-[#0A0A0A]">
                  참고 가이드
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowExample(false)}
                className="p-1 bg-white border border-[#0A0A0A] rounded text-[#0A0A0A] hover:bg-[#F1F0E8] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs text-[#0A0A0A]">
              <div className="p-2.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg text-xs leading-relaxed">
                💡 <strong>안내:</strong> 작성 중이던 데이터는 100% 안전하게 유지됩니다. 이 창을 닫고 작성을 계속 진행하세요!
              </div>

              <div className="space-y-3 bg-[#FAFAF5] p-4 border-2 border-[#0A0A0A] rounded-xl">
                <div>
                  <span className="font-bold text-[#52525B] text-[10px] uppercase block">사이트명</span>
                  <p className="font-bold text-sm text-[#0A0A0A]">바이브로그 (VibeLog)</p>
                </div>

                <div>
                  <span className="font-bold text-[#52525B] text-[10px] uppercase block">접속 주소(URL)</span>
                  <p className="font-mono text-xs text-[#1F5FD1] underline">https://vibelog.example.com</p>
                </div>

                <div>
                  <span className="font-bold text-[#52525B] text-[10px] uppercase block">카테고리 & 태그 선택</span>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="bg-[#FFD23F] text-[#0A0A0A] font-black px-2 py-0.5 rounded border border-[#0A0A0A] text-[11px]">
                      생산성
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-[#0A0A0A] font-bold text-[11px]">
                      #메모
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-[#0A0A0A] font-bold text-[11px]">
                      #글쓰기
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-[#0A0A0A] font-bold text-[11px]">
                      #대시보드
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-[#52525B] text-[10px] uppercase block">한 줄 소개 (카드에 노출)</span>
                  <p className="font-medium text-xs text-[#0A0A0A] bg-white p-2 rounded border border-[#0A0A0A]">
                    매일의 생각과 코딩 기록을 마크다운으로 가볍게 덤프하는 1인 개발 생산성 웹앱
                  </p>
                </div>

                <div>
                  <span className="font-bold text-[#52525B] text-[10px] uppercase block">상세 설명 (상세 팝업에 노출)</span>
                  <p className="font-medium text-xs text-[#0A0A0A] bg-white p-2.5 rounded border border-[#0A0A0A] leading-relaxed">
                    복잡한 가입 없이 브라우저에서 바로 마크다운으로 메모를 시작할 수 있습니다.<br />
                    • 로컬 스토리지 실시간 자동 저장 및 클라우드 백업<br />
                    • 태그별 잔디 통계 및 주간 리포트<br />
                    • 다크모드 및 단축키 지원
                  </p>
                </div>

                <div>
                  <span className="font-bold text-[#52525B] text-[10px] uppercase block">제작자 연락처</span>
                  <p className="text-xs text-[#52525B]">
                    <strong>디스코드 @viber_dev</strong>, <strong>카카오 오픈채팅 링크</strong>, <strong>이메일</strong> 등 자유 형식
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExample(false)}
                className="w-full py-2.5 bg-[#0A0A0A] text-white font-bold text-xs rounded-lg hover:bg-neutral-800 transition-colors shadow-[2px_2px_0_#FFD23F]"
              >
                확인 완료 (계속 작성하기)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
