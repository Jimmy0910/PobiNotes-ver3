import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import {
  Users,
  MessageSquare,
  Trash2,
  Star,
  Loader2,
  RefreshCw,
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Square
} from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  email?: string | null;
  auth_provider?: string | null;
  is_admin: number;
  created_at: string | number;
}

interface FeedbackItem {
  id: string;
  user_id: string;
  username?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface SendEmailResultItem {
  email: string;
  username: string;
  ok: boolean;
  id?: string;
  status?: number;
  error?: string;
}

interface SendEmailSummary {
  success: boolean;
  partial?: boolean;
  total: number;
  sentCount: number;
  failedCount: number;
  results: SendEmailResultItem[];
}

export default function AdminPanel() {
  const { showToast, confirmDialog } = useUiFeedback();
  const [activeTab, setActiveTab] = useState<'users' | 'feedback' | 'email'>('users');
  const [providerFilter, setProviderFilter] = useState<'all' | 'google' | 'local'>('all');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create new user directly from Admin Panel
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  // Update Notification Email Composer State
  const [emailMode, setEmailMode] = useState<'test' | 'selected' | 'all'>('test');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [selectedEmailUserIds, setSelectedEmailUserIds] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('POBI STUDIO 數位錯題手帳｜新版本功能更新通知');
  const [emailVersionTag, setEmailVersionTag] = useState('版本更新');
  const [emailBody, setEmailBody] = useState(
    '分析與工坊改版為 3 階段引導流程，可自由切換分類占比圖表與弱點熱度圖。\n每日複習簡化為「選擇範圍」與「開始複習」兩步驟，複習週期設定改為預先收折。\n批次匯入與編輯視窗全面優化，平板操作更流暢。'
  );
  const [emailCtaUrl, setEmailCtaUrl] = useState('https://pobinotes-ver3.pages.dev/');
  const [emailCtaText, setEmailCtaText] = useState('立即開啟 POBI STUDIO 體驗新版');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendSummary, setSendSummary] = useState<SendEmailSummary | null>(null);

  const usersWithEmail = useMemo(
    () => users.filter(u => typeof u.email === 'string' && u.email.trim().includes('@')),
    [users]
  );

  const previewLines = useMemo(
    () =>
      emailBody
        .split(/\r?\n/)
        .map(l => l.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean),
    [emailBody]
  );

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/admin/users');
      setUsers(Array.isArray(res) ? res : res.users || []);
    } catch (e: any) {
      setError(e.message || '無法載入用戶列表');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      setError('請輸入新用戶的帳號名稱與密碼');
      return;
    }
    setCreatingUser(true);
    setError('');
    setCreateSuccessMsg('');
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: {
          username: newUsername.trim(),
          password: newPassword,
          is_admin: 0
        }
      });
      setCreateSuccessMsg(`已成功建立用戶「${newUsername.trim()}」！`);
      setNewUsername('');
      setNewPassword('');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || '建立用戶失敗');
    } finally {
      setCreatingUser(false);
    }
  };

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/feedback');
      setFeedbackList(Array.isArray(res) ? res : res.feedback || []);
    } catch (e: any) {
      setError(e.message || '無法載入意見回饋');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'email') {
      fetchUsers();
    } else {
      fetchFeedback();
    }
  }, [activeTab]);

  const handleToggleEmailRecipient = (userId: string) => {
    setSelectedEmailUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSendUpdateEmail = async () => {
    if (!emailSubject.trim()) {
      showToast('請輸入更新通知信主旨', 'error');
      return;
    }
    if (!emailBody.trim()) {
      showToast('請輸入更新內容重點', 'error');
      return;
    }
    if (emailMode === 'selected' && selectedEmailUserIds.length === 0) {
      showToast('請至少勾選一位收件用戶', 'error');
      return;
    }
    if (emailMode === 'all' && usersWithEmail.length === 0) {
      showToast('目前尚無已綁定信箱的註冊用戶', 'error');
      return;
    }

    const targetDesc =
      emailMode === 'test'
        ? testEmailInput.trim()
          ? `測試信箱「${testEmailInput.trim()}」`
          : '環境變數預設測試信箱（RESEND_TEST_TO）'
        : emailMode === 'selected'
        ? `已勾選的 ${selectedEmailUserIds.length} 位用戶`
        : `全部已綁定信箱的 ${usersWithEmail.length} 位用戶`;

    const confirmed = await confirmDialog({
      title: '確認寄出更新通知信',
      message: `即將寄送主旨為「${emailSubject.trim()}」的更新通知信給${targetDesc}，確定要寄出嗎？`,
      confirmText: '確認寄出',
      cancelText: '取消',
      danger: false
    });
    if (!confirmed) return;

    setSendingEmail(true);
    setError('');
    setSendSummary(null);

    try {
      const res = await apiRequest('/api/admin/send-update-email', {
        method: 'POST',
        body: {
          mode: emailMode,
          subject: emailSubject.trim(),
          versionTag: emailVersionTag.trim(),
          body: emailBody.trim(),
          ctaUrl: emailCtaUrl.trim(),
          ctaText: emailCtaText.trim(),
          testEmail: testEmailInput.trim(),
          recipientUserIds: selectedEmailUserIds
        }
      });

      const summary: SendEmailSummary = {
        success: Boolean(res?.success),
        partial: Boolean(res?.partial),
        total: Number(res?.total || 0),
        sentCount: Number(res?.sentCount || 0),
        failedCount: Number(res?.failedCount || 0),
        results: Array.isArray(res?.results) ? res.results : []
      };
      setSendSummary(summary);

      if (summary.failedCount === 0 && summary.sentCount > 0) {
        showToast(`更新通知信寄送完成（成功 ${summary.sentCount} 封）`, 'success');
      } else if (summary.sentCount > 0) {
        showToast(`部分寄送完成（成功 ${summary.sentCount} 封、失敗 ${summary.failedCount} 封）`, 'info');
      } else {
        showToast('寄送未成功，請查看下方明細說明', 'error');
      }
    } catch (err: any) {
      const msg = err?.message || '寄送更新通知信失敗';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    const ok = await confirmDialog({
      title: '刪除用戶確認',
      message: `確定要刪除用戶「${username}」嗎？此操作無法復原！`,
      confirmText: '確認刪除',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`已刪除用戶「${username}」`, 'success');
    } catch (e: any) {
      showToast(e.message || '刪除用戶失敗', 'error');
    }
  };

  const handleClearMistakes = async (userId?: string, username?: string) => {
    const targetName = username ? `用戶「${username}」的` : '目前帳號的全部';
    const ok = await confirmDialog({
      title: '清空錯題資料確認',
      message: `確定要清空${targetName}錯題記錄嗎？此操作將清除所有錯題資料！`,
      confirmText: '確認清空',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    try {
      const endpoint = userId ? `/api/mistakes?all=true&userId=${userId}` : '/api/mistakes?all=true';
      await apiRequest(endpoint, { method: 'DELETE' });
      showToast(`已成功清空${targetName}錯題記錄，即將重新載入`, 'success');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e: any) {
      showToast(e.message || '清空失敗', 'error');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < rating ? 'var(--warning)' : 'none'}
        color={i < rating ? 'var(--warning)' : 'var(--text-muted)'}
      />
    ));
  };

  const formatDate = (dateStr: string | number) => {
    try {
      const num = typeof dateStr === 'number' ? dateStr : Number(dateStr);
      if (!isNaN(num) && num > 0) {
        return new Date(num < 1e12 ? num * 1000 : num).toLocaleString('zh-TW');
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('zh-TW');
      }
      return String(dateStr);
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <div style={{ maxWidth: activeTab === 'email' ? '1080px' : '900px', margin: '0 auto', transition: 'max-width 0.2s ease' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }} className="title-gradient">
          管理員面板
        </h2>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} /> 用戶管理 ({users.length})
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'feedback' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare size={16} /> 用戶回饋
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('email')}
              data-testid="admin-tab-update-email"
            >
              <Mail size={16} /> 更新通知信
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => (activeTab === 'feedback' ? fetchFeedback() : fetchUsers())}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> 重新整理列表
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: 'var(--danger-glow)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Loader2 size={24} className="animate-spin" style={{ marginBottom: '8px' }} />
            <div>載入中...</div>
          </div>
        )}

        {/* Users Tab */}
        {!loading && activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Create User Card */}
            <form
              onSubmit={handleCreateUser}
              className="glass-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: '12px'
              }}
            >
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  新增用戶帳號名稱
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="輸入新用戶名稱"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  disabled={creatingUser}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  設定登入密碼
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="輸入登入密碼"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={creatingUser}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creatingUser || !newUsername.trim() || !newPassword}
                style={{ height: '40px', padding: '0 18px' }}
              >
                <UserPlus size={16} />
                <span>{creatingUser ? '建立中...' : '建立新帳戶'}</span>
              </button>
              {createSuccessMsg && (
                <div style={{ width: '100%', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                  {createSuccessMsg}
                </div>
              )}
            </form>

            {/* Provider Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(() => {
                const googleCount = users.filter(u => u.auth_provider === 'google').length;
                const localCount = users.length - googleCount;
                const items: Array<{ key: 'all' | 'google' | 'local'; label: string }> = [
                  { key: 'all', label: `全部用戶 (${users.length})` },
                  { key: 'google', label: `Google 登入 (${googleCount})` },
                  { key: 'local', label: `一般帳密 (${localCount})` }
                ];
                return items.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={`btn ${providerFilter === item.key ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                    onClick={() => setProviderFilter(item.key)}
                  >
                    {item.label}
                  </button>
                ));
              })()}
            </div>

            <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={thStyle}>使用者名稱</th>
                  <th style={thStyle}>登入方式 / Gmail</th>
                  <th style={thStyle}>角色</th>
                  <th style={thStyle}>建立時間</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(u => {
                    if (providerFilter === 'google') return u.auth_provider === 'google';
                    if (providerFilter === 'local') return u.auth_provider !== 'google';
                    return true;
                  })
                  .map(u => {
                    const isGoogle = u.auth_provider === 'google';
                    return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={tdStyle}>{u.username}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: isGoogle ? 'rgba(66, 133, 244, 0.16)' : 'rgba(255,255,255,0.05)',
                          color: isGoogle ? '#4285F4' : 'var(--text-secondary)',
                          border: `1px solid ${isGoogle ? 'rgba(66, 133, 244, 0.4)' : 'var(--glass-border)'}`
                        }}>
                          {isGoogle ? 'Google' : '帳密'}
                        </span>
                        {u.email && (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            {u.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: u.is_admin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: u.is_admin ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: `1px solid ${u.is_admin ? 'var(--accent-primary)' : 'var(--glass-border)'}`
                      }}>
                        {u.is_admin ? '管理員' : '一般用戶'}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDate(u.created_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--warning)' }}
                          onClick={() => handleClearMistakes(u.id, u.username)}
                          title="清空此用戶的全部錯題"
                        >
                          <Trash2 size={13} /> 清空錯題
                        </button>
                        {!u.is_admin && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            title="刪除用戶帳號"
                          >
                            <Trash2 size={13} /> 刪除用戶
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                    );
                  })}
                {users.filter(u => {
                  if (providerFilter === 'google') return u.auth_provider === 'google';
                  if (providerFilter === 'local') return u.auth_provider !== 'google';
                  return true;
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                      尚無符合條件的用戶資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {!loading && activeTab === 'feedback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {feedbackList.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                尚無意見回饋
              </div>
            )}
            {feedbackList.map(fb => (
              <div key={fb.id} className="glass-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{fb.username || '匿名'}</strong>
                    <div style={{ display: 'flex', gap: '2px' }}>{renderStars(fb.rating)}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDate(fb.created_at)}
                  </span>
                </div>
                {fb.comment && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                    {fb.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Update Notification Email Tab */}
        {!loading && activeTab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="admin-update-email-panel">
            {/* Domain Limitation Notice */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                color: 'var(--warning-text)',
                fontSize: '0.83rem',
                lineHeight: 1.65
              }}
            >
              <strong>寄信網域提醒：</strong>
              在 Resend 尚未驗證自訂網域前，使用預設測試寄件者僅能寄送至<strong>您註冊 Resend 的本人信箱</strong>或官方測試信箱；日後綁定自訂網域並於 Cloudflare Pages 更新環境變數 <code>RESEND_FROM_EMAIL</code> 後，即可直接批次寄送給所有已綁定信箱的用戶（不需改程式碼）。
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', alignItems: 'start' }}>
              {/* Left: Composer & Recipient Controls */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} style={{ color: 'var(--accent-secondary)' }} />
                  <span>撰寫更新通知信</span>
                </div>

                {/* Recipient Mode Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>1. 選擇寄送對象</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      type="button"
                      className={`btn ${emailMode === 'test' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setEmailMode('test')}
                    >
                      測試寄送（單一信箱）
                    </button>
                    <button
                      type="button"
                      className={`btn ${emailMode === 'selected' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setEmailMode('selected')}
                    >
                      指定用戶 ({selectedEmailUserIds.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${emailMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setEmailMode('all')}
                    >
                      全部已綁信箱用戶 ({usersWithEmail.length})
                    </button>
                  </div>

                  {emailMode === 'test' && (
                    <div style={{ marginTop: '4px' }}>
                      <input
                        type="email"
                        className="input"
                        placeholder="輸入您的 Resend 帳號信箱（留空則使用環境變數 RESEND_TEST_TO）"
                        value={testEmailInput}
                        onChange={e => setTestEmailInput(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.86rem' }}
                        data-testid="admin-update-email-test-input"
                      />
                    </div>
                  )}

                  {emailMode === 'selected' && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        backgroundColor: 'var(--bg-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '180px',
                        overflowY: 'auto'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>可寄送之已綁信箱用戶（{usersWithEmail.length} 人）</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                            onClick={() => setSelectedEmailUserIds(usersWithEmail.map(u => u.id))}
                          >
                            全選
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                            onClick={() => setSelectedEmailUserIds([])}
                          >
                            清除
                          </button>
                        </div>
                      </div>
                      {usersWithEmail.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                          目前尚無已綁定信箱的用戶
                        </div>
                      ) : (
                        usersWithEmail.map(u => {
                          const checked = selectedEmailUserIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleToggleEmailRecipient(u.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: checked ? '1px solid var(--accent-secondary)' : '1px solid var(--glass-border)',
                                backgroundColor: checked ? 'var(--warning-bg)' : 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.8rem'
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                                {checked ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span>{u.username}</span>
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', wordBreak: 'break-all' }}>
                                {u.email}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Subject & Version Tag */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">2. 信件主旨 *</label>
                    <input
                      type="text"
                      className="input"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="輸入通知信主旨"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                      data-testid="admin-update-email-subject"
                    />
                  </div>
                  <div>
                    <label className="form-label">版本標記（選填）</label>
                    <input
                      type="text"
                      className="input"
                      value={emailVersionTag}
                      onChange={e => setEmailVersionTag(e.target.value)}
                      placeholder="例如：v3.2 更新"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Body Highlights */}
                <div>
                  <label className="form-label">3. 更新內容重點（每行自動轉為一條項目）*</label>
                  <textarea
                    className="input"
                    rows={6}
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder="輸入本次更新項目，每行一條..."
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.86rem', lineHeight: 1.6, resize: 'vertical' }}
                    data-testid="admin-update-email-body"
                  />
                </div>

                {/* CTA Button Customization */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">按鈕文字</label>
                    <input
                      type="text"
                      className="input"
                      value={emailCtaText}
                      onChange={e => setEmailCtaText(e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">按鈕網址</label>
                    <input
                      type="url"
                      className="input"
                      value={emailCtaUrl}
                      onChange={e => setEmailCtaUrl(e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendUpdateEmail}
                  disabled={sendingEmail}
                  data-testid="admin-send-update-email-btn"
                  style={{ padding: '11px 18px', fontSize: '0.92rem', fontWeight: 700, justifyContent: 'center' }}
                >
                  {sendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>
                    {sendingEmail
                      ? '寄送中，請稍候...'
                      : emailMode === 'test'
                      ? '寄出測試更新通知信'
                      : emailMode === 'selected'
                      ? `寄出給指定用戶（${selectedEmailUserIds.length} 人）`
                      : `寄出給全部已綁信箱用戶（${usersWithEmail.length} 人）`}
                  </span>
                </button>

                {/* Delivery Summary */}
                {sendSummary && (
                  <div
                    data-testid="admin-update-email-result"
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${sendSummary.failedCount === 0 ? 'var(--success)' : 'var(--warning)'}`,
                      backgroundColor: 'var(--bg-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sendSummary.failedCount === 0 ? (
                        <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      ) : (
                        <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
                      )}
                      <span>
                        寄送完成：成功 {sendSummary.sentCount} 封 / 失敗 {sendSummary.failedCount} 封（共 {sendSummary.total} 封）
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                      {sendSummary.results.map((item, idx) => (
                        <div
                          key={`${item.email}-${idx}`}
                          style={{
                            fontSize: '0.78rem',
                            color: item.ok ? 'var(--success)' : 'var(--danger)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span>
                            {item.username}（{item.email}）
                          </span>
                          <span>{item.ok ? `已送出 (${item.id || 'OK'})` : `失敗：${item.error || '未知錯誤'}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Live Branded Email Preview */}
              <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  信件版型即時預覽
                </div>
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #DFD5C3',
                    backgroundColor: '#FFFFFF',
                    color: '#29251F'
                  }}
                >
                  <div style={{ backgroundColor: '#145B38', padding: '20px 22px', borderBottom: '3px solid #C89A50' }}>
                    <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: '#E8C27A', fontWeight: 700 }}>
                      POBI STUDIO | 數位錯題手帳
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.4 }}>
                      {emailSubject || '（尚未填寫主旨）'}
                    </div>
                    {emailVersionTag.trim() && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '8px',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(255,255,255,0.14)',
                          border: '1px solid #C89A50',
                          color: '#FBF8F1',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {emailVersionTag.trim()}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '20px 22px', fontSize: '0.86rem', lineHeight: 1.68 }}>
                    <div style={{ color: '#29251F', marginBottom: '8px' }}>同學 您好，</div>
                    <div style={{ color: '#57534E', marginBottom: '12px' }}>
                      POBI STUDIO 數位錯題手帳剛剛推出了新的功能與體驗更新，以下是本次重點整理：
                    </div>
                    <div
                      style={{
                        backgroundColor: '#FBF8F1',
                        border: '1px solid #E6DEC8',
                        borderLeft: '4px solid #C89A50',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '18px'
                      }}
                    >
                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#29251F' }}>
                        {previewLines.length > 0 ? (
                          previewLines.map((line, i) => (
                            <li key={i} style={{ marginBottom: '6px' }}>
                              {line}
                            </li>
                          ))
                        ) : (
                          <li style={{ color: '#81796E' }}>（請於左側輸入更新內容重點）</li>
                        )}
                      </ul>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '9px 22px',
                          borderRadius: '999px',
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        {emailCtaText || '立即前往體驗新版'}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: '#FBF8F1',
                      borderTop: '1px solid #E6DEC8',
                      padding: '12px 18px',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      color: '#81796E'
                    }}
                  >
                    POBI STUDIO 數位錯題手帳 · Explore. Decode. Understand.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Table cell styles */
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  background: 'var(--glass-highlight)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '0.9rem',
  color: 'var(--text-primary)',
};
