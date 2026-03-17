import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AiChatMode } from '../types';
import styles from './AiAssistant.module.css';

const MODE_INFO: Record<AiChatMode, { label: string; placeholder: string; systemPrompt: string }> = {
  research: {
    label: '고객사 리서치',
    placeholder: '분석할 고객사명을 입력하세요 (예: 한국수력원자력)',
    systemPrompt: `당신은 B2B 영업 전문가입니다. 고객사를 분석할 때 다음을 포함해 한국어로 답변하세요:
1. 회사 개요 및 주요 사업
2. 최근 IT/디지털 투자 동향
3. 조달 및 입찰 패턴
4. 영업 공략 포인트
간결하고 실용적으로 작성하세요.`,
  },
  objection: {
    label: '반론 대응',
    placeholder: '고객의 반론을 입력하세요 (예: "가격이 너무 비싸요")',
    systemPrompt: `당신은 경험 많은 B2B 영업 전문가입니다. 고객의 반론에 대해 다음 구조로 한국어 대응 스크립트를 작성하세요:
1. 공감 표현 (1-2문장)
2. 반론 재프레이밍
3. 가치 강조 포인트
4. 다음 단계 제안
실제 영업 현장에서 바로 쓸 수 있도록 구체적으로 작성하세요.`,
  },
  summary: {
    label: '미팅 요약',
    placeholder: '미팅 내용을 자유롭게 붙여넣으세요...',
    systemPrompt: `당신은 B2B 영업 전문가입니다. 미팅 내용을 다음 형식으로 한국어로 정리하세요:
📋 핵심 논의사항 (3-5줄)
✅ 액션아이템 (담당자/기한 포함)
🎯 다음 단계
⚠️ 주요 리스크/이슈
간결하게 핵심만 작성하세요.`,
  },
};

export default function AiAssistant() {
  const { aiChats, addAiChat, clearAiChats } = useApp();
  const [mode, setMode] = useState<AiChatMode>('research');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentChats = aiChats.filter(c => c.mode === mode);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChats.length, loading]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);

    await addAiChat(mode, 'user', content);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        await addAiChat(mode, 'assistant', '⚠️ API 키 미설정: .env.local 파일에 VITE_OPENAI_API_KEY를 추가하고 재배포해 주세요.\nGitHub에서 배포 중이라면 Settings → Secrets → VITE_OPENAI_API_KEY도 추가해야 합니다.');
        setLoading(false);
        return;
      }

      // 최근 6개 메시지(3턴)만 유지해서 토큰 비용 절감
      const HISTORY_LIMIT = 6;
      const history = currentChats
        .slice(-HISTORY_LIMIT)
        .map(c => ({ role: c.role as 'user' | 'assistant', content: c.content }));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          max_completion_tokens: 1000,
          messages: [
            { role: 'system', content: MODE_INFO[mode].systemPrompt },
            ...history,
            { role: 'user', content },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error?.message || `HTTP ${response.status}`;
        console.error('OpenAI API error:', JSON.stringify(data));
        await addAiChat(mode, 'assistant', `오류: ${errMsg}`);
        return;
      }
      const reply = data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.';
      await addAiChat(mode, 'assistant', reply);
    } catch (e) {
      await addAiChat(mode, 'assistant', `오류가 발생했습니다: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI 어시스턴트</h1>
          <p className={styles.subtitle}>Claude 기반 영업 지원 어시스턴트</p>
        </div>
        {currentChats.length > 0 && (
          <button className={styles.clearBtn} onClick={() => { if (confirm(`${MODE_INFO[mode].label} 대화를 모두 지울까요?`)) clearAiChats(mode); }}>
            <Trash2 size={13} /> 대화 초기화
          </button>
        )}
      </div>

      {/* 모드 선택 */}
      <div className={styles.modeRow}>
        {(Object.keys(MODE_INFO) as AiChatMode[]).map(m => (
          <button key={m} className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`} onClick={() => setMode(m)}>
            {MODE_INFO[m].label}
          </button>
        ))}
      </div>

      {/* 채팅 영역 */}
      <div className={styles.chatWrap}>
        <div className={styles.chatArea}>
          {currentChats.length === 0 && (
            <div className={styles.welcomeMsg}>
              <div className={styles.botIcon}><Bot size={22} /></div>
              <p className={styles.welcomeTitle}>{MODE_INFO[mode].label}</p>
              <p className={styles.welcomeDesc}>{MODE_INFO[mode].placeholder}</p>
            </div>
          )}
          {currentChats.map(chat => (
            <div key={chat.id} className={`${styles.msgWrap} ${chat.role === 'user' ? styles.msgUser : styles.msgAssistant}`}>
              {chat.role === 'assistant' && (
                <div className={styles.avatar}><Bot size={13} /></div>
              )}
              <div className={`${styles.bubble} ${chat.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                {chat.content.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < chat.content.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className={`${styles.msgWrap} ${styles.msgAssistant}`}>
              <div className={styles.avatar}><Bot size={13} /></div>
              <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.loadingBubble}`}>
                <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력 영역 */}
        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            className={styles.inputBox}
            placeholder={MODE_INFO[mode].placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={2}
          />
          <button className={styles.sendBtn} onClick={handleSend} disabled={loading || !input.trim()}>
            <Send size={15} />
          </button>
        </div>
        <p className={styles.inputHint}>Enter로 전송 · Shift+Enter로 줄바꿈 · 최근 3턴 대화만 유지 (비용 절감)</p>
      </div>
    </div>
  );
}
