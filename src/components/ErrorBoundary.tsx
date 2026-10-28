import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFFBEA] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border-3 border-[#0A0A0A] rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0_#0A0A0A] space-y-5 text-center">
            <div className="w-16 h-16 bg-[#FF6B6B] border-2 border-[#0A0A0A] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-[3px_3px_0_#0A0A0A]">
              ⚠️
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl font-black text-[#0A0A0A]">
                화면을 불러오는 중 일시적인 오류가 발생했습니다
              </h1>
              <p className="text-xs text-[#52525B] leading-relaxed">
                데이터 동기화 또는 브라우저 캐시 문제로 화면 렌더링이 일시 중단되었습니다.
                아래 복구 버튼을 누르면 즉시 정상화됩니다.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-lg text-left text-xs font-mono text-neutral-700 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 bg-[#FFD23F] hover:bg-[#FFD23F]/90 text-[#0A0A0A] font-bold text-xs border-2 border-[#0A0A0A] rounded-xl shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                페이지 새로고침
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 py-3 bg-white hover:bg-neutral-50 text-[#0A0A0A] font-bold text-xs border-2 border-[#0A0A0A] rounded-xl shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                캐시 초기화 후 재접속
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
