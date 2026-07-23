import React, { useState } from 'react';
import { Player, ForumPost, GameState, DirectMessage } from '../types.ts';
import { FlagSymbol } from './FlagSymbol.tsx';
import { 
  MessageSquare, 
  Send, 
  MessageCircle, 
  ArrowLeft, 
  PlusCircle, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Skull,
  ShieldAlert,
  Compass
} from 'lucide-react';

interface ForumProps {
  player: Player;
  gameState: GameState;
  onFetchState: () => Promise<void>;
  token: string | null;
}

export const Forum: React.FC<ForumProps> = ({
  player,
  gameState,
  onFetchState,
  token,
}) => {
  const [activeTab, setActiveTab] = useState<'tavern' | 'whispers'>('tavern');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Forum Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  
  // Direct Messages states
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [whisperContent, setWhisperContent] = useState('');

  // Status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const posts = gameState.forum || [];
  const activePost = posts.find(p => p.id === activePostId);

  const totalTavernMessages = posts.reduce((acc, p) => acc + 1 + (p.replies ? p.replies.length : 0), 0);
  const totalDirectWhispers = (gameState.directMessages || []).filter(
    dm => dm.senderId === player.id || dm.receiverId === player.id
  ).length;

  // Filter other active players to send direct messages to
  const otherPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.id !== player.id);
  const selectedRecipient = otherPlayers.find(p => p.id === selectedRecipientId) as Player | undefined;

  // Conversation for currently selected recipient
  const conversationMessages = (gameState.directMessages || []).filter(
    dm => (dm.senderId === player.id && dm.receiverId === selectedRecipientId) ||
          (dm.senderId === selectedRecipientId && dm.receiverId === player.id)
  );

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!token) return;

    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMsg('Title and description are required, Captain!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/forum/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });

      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setShowCreateForm(false);
        setSuccessMsg('Thread posted in the tavern scroll!');
        await onFetchState();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to post thread.');
      }
    } catch (err) {
      setErrorMsg('Server connection lost.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!token || !activePostId) return;

    if (!replyContent.trim()) {
      setErrorMsg('Reply cannot be empty!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/post/${activePostId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyContent })
      });

      if (res.ok) {
        setReplyContent('');
        setSuccessMsg('Response dispatched!');
        await onFetchState();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to dispatch reply.');
      }
    } catch (err) {
      setErrorMsg('Server connection lost.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhisper = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!token || !selectedRecipientId) return;

    if (!whisperContent.trim()) {
      setErrorMsg('Whisper content cannot be empty!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: selectedRecipientId, content: whisperContent })
      });

      if (res.ok) {
        setWhisperContent('');
        await onFetchState();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to dispatch whisper.');
      }
    } catch (err) {
      setErrorMsg('Server connection lost.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER HERO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/25 flex items-center justify-center flex-shrink-0">
            <Skull className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">The Pirate Tavern & Counsel</h2>
            <p className="text-[11px] font-mono text-neutral-400">Share public feedback or send confidential whispers securely to rival Captains.</p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('tavern');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-4 py-2 text-xs font-bold font-mono rounded-xl transition ${
              activeTab === 'tavern'
                ? 'bg-amber-600 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            TAVERN BOARD ({totalTavernMessages})
          </button>
          <button
            onClick={() => {
              setActiveTab('whispers');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-4 py-2 text-xs font-bold font-mono rounded-xl transition ${
              activeTab === 'whispers'
                ? 'bg-amber-600 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            DIRECT WHISPERS ({totalDirectWhispers})
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATIONS */}
      {errorMsg && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-2xl text-xs font-mono text-red-200 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-teal-950/40 border border-teal-500/30 rounded-2xl text-xs font-mono text-teal-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'tavern' ? (
        /* ==================== TAVERN BOARD TAB ==================== */
        activePostId && activePost ? (
          <div className="space-y-6">
            
            {/* Back button */}
            <button
              onClick={() => {
                setActivePostId(null);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 hover:text-white transition bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
              BACK TO TAVERN REGISTER
            </button>

            {/* Original Post */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
                <FlagSymbol flagId={activePost.senderFlagId} color={activePost.senderFlagColor} size="sm" />
                <div>
                  <span className="font-bold text-slate-200 text-xs">{activePost.senderName}</span>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(activePost.timestamp)}</span>
                    {activePost.senderId === player.id && (
                      <span className="text-rose-500 font-bold ml-1.5">(You)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-white tracking-wide">{activePost.title}</h3>
                <p className="text-neutral-300 text-xs whitespace-pre-wrap leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-slate-850 font-mono">{activePost.content}</p>
              </div>
            </div>

            {/* Replies Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest pl-2">
                REPLIES ({activePost.replies.length})
              </h4>

              {activePost.replies.length === 0 ? (
                <div className="p-8 bg-slate-950/50 border border-dashed border-neutral-800 rounded-3xl text-center text-xs text-neutral-500 font-mono">
                  No responses recorded on this scroll yet, Captain. Be the first to speak!
                </div>
              ) : (
                <div className="space-y-4">
                  {activePost.replies.map(reply => (
                    <div key={reply.id} className="bg-slate-900/70 border border-slate-850 rounded-3xl p-4 shadow-xl space-y-3 ml-4 md:ml-8">
                      <div className="flex items-center gap-2 border-b border-slate-850/60 pb-2">
                        <FlagSymbol flagId={reply.senderFlagId} color={reply.senderFlagColor} size="sm" />
                        <div>
                          <span className="font-bold text-slate-300 text-xs">{reply.senderName}</span>
                          <div className="flex items-center gap-1 text-[9px] text-neutral-500 font-mono mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatDate(reply.timestamp)}</span>
                            {reply.senderId === player.id && (
                              <span className="text-rose-500 font-bold ml-1">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-neutral-300 text-xs whitespace-pre-wrap leading-relaxed font-mono bg-slate-950/20 p-3 rounded-xl border border-slate-900">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Reply Form */}
            <form onSubmit={handleCreateReply} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 font-mono">
                <MessageSquare className="w-4 h-4 text-rose-500" />
                RECORD YOUR COUNSEL
              </h4>

              <div className="space-y-2">
                <textarea
                  placeholder="Write your response, Captain... Speak of alliances, threats, or strategy."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white placeholder-neutral-500 font-mono focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 text-white font-mono font-bold text-xs px-5 py-2.5 rounded-2xl transition w-full md:w-auto"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'DISPATCHING MESSAGE...' : 'DISPATCH REPLY'}
              </button>
            </form>

          </div>
        ) : showCreateForm ? (
          /* CREATE THREAD FORM */
          <div className="space-y-6">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 hover:text-white transition bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
              BACK TO TAVERN REGISTER
            </button>

            <form onSubmit={handleCreatePost} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 font-mono border-b border-slate-800 pb-3">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                CREATE NEW TAVERN DISCUSSION
              </h3>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1.5">THREAD TITLE / DECREE</label>
                  <input
                    type="text"
                    placeholder="e.g., Alliance Proposal: Defeating the Black Flag Corsairs..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-neutral-600 focus:border-amber-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1.5">DISCUSSION WRIT / MESSAGES</label>
                  <textarea
                    placeholder="Draft your decree, coordinate battle logistics, or request materials..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-neutral-600 focus:border-amber-500 outline-none transition-all leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 text-slate-950 font-mono font-black text-xs px-6 py-3 rounded-2xl transition w-full md:w-auto"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'DISPATCHING SCROLL...' : 'PIN DISCUSSION WRIT'}
              </button>
            </form>
          </div>
        ) : (
          /* DISCUSSION LIST */
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest font-mono">
                Tavern Discussion Scroll
              </h3>
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setShowCreateForm(true);
                }}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono font-black text-[11px] px-3 py-2 rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                NEW THREAD
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
              {posts.length === 0 ? (
                <div className="p-12 bg-slate-950/50 border border-dashed border-neutral-800 rounded-3xl text-center">
                  <MessageCircle className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400 text-xs font-mono">No discussions have been pinned to the scroll yet, Lord {player.username}.</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30 text-xs font-mono px-4 py-2 rounded-xl transition"
                  >
                    Assemble the Pirate Council
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {posts.slice().reverse().map(post => (
                    <div
                      key={post.id}
                      onClick={() => {
                        setActivePostId(post.id);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="py-4 first:pt-0 last:pb-0 flex items-start gap-4 hover:bg-slate-950/30 px-3 -mx-3 rounded-2xl cursor-pointer transition-colors group"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <FlagSymbol flagId={post.senderFlagId} color={post.senderFlagColor} size="sm" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-neutral-500 font-bold group-hover:text-amber-500 transition-colors">
                            By {post.senderName}
                          </span>
                          <span className="font-mono text-[9px] text-neutral-500">
                            {formatDate(post.timestamp)}
                          </span>
                        </div>

                        <h4 className="font-sans font-bold text-xs text-slate-200 tracking-wide group-hover:text-white transition-colors truncate">
                          {post.title}
                        </h4>

                        <p className="font-mono text-[11px] text-neutral-400 truncate leading-relaxed">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-850 font-mono text-[10px] text-neutral-400 group-hover:border-slate-700 transition">
                        <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                        <span>{post.replies.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* ==================== DIRECT WHISPERS TAB ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: ACTIVE CAPTAINS LIST */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest font-mono px-1">
              Active Captains
            </h3>
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl max-h-[400px] overflow-y-auto space-y-2">
              {otherPlayers.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 font-mono">
                  No other rival Captains found in these waters yet.
                </div>
              ) : (
                otherPlayers.map(p => {
                  const isSelected = p.id === selectedRecipientId;
                  // Count unread or count total messages in thread
                  const threadMessages = (gameState.directMessages || []).filter(
                    dm => (dm.senderId === p.id && dm.receiverId === player.id) ||
                          (dm.senderId === player.id && dm.receiverId === p.id)
                  );
                  const lastMsg = threadMessages[threadMessages.length - 1];

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedRecipientId(p.id);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 border transition-all text-left group ${
                        isSelected
                          ? 'bg-slate-950 border-amber-500/50'
                          : 'bg-slate-900/60 border-transparent hover:bg-slate-950/40 hover:border-slate-800'
                      }`}
                    >
                      <FlagSymbol flagId={p.flagId} color={p.flagColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors flex items-center justify-between">
                          <span className="truncate">{p.username}</span>
                          {threadMessages.length > 0 && (
                            <span className="text-[9px] bg-slate-950 border border-slate-850 text-neutral-500 px-1.5 py-0.5 rounded-md font-mono">
                              {threadMessages.length}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                          {lastMsg ? lastMsg.content : 'No messages exchanged'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CHAT WINDOW */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest font-mono px-1">
              Confidential Whisper Scroll
            </h3>

            {selectedRecipient ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col h-[400px]">
                
                {/* Active Chat Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-4">
                  <FlagSymbol flagId={selectedRecipient.flagId} color={selectedRecipient.flagColor} size="sm" />
                  <div>
                    <span className="font-bold text-white text-xs">{selectedRecipient.username}</span>
                    <span className="text-[9px] text-amber-400 block font-mono">ENCRYPTED WHISPER LINE</span>
                  </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                  {conversationMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-neutral-500 font-mono">
                      <MessageSquare className="w-8 h-8 text-neutral-700 mb-2" />
                      <p>This parchment is empty. Send a confidential whisper to start trading coordinates, plotting battles, or negotiating alliances.</p>
                    </div>
                  ) : (
                    conversationMessages.map(msg => {
                      const isMe = msg.senderId === player.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-3 border font-mono text-xs ${
                              isMe
                                ? 'bg-amber-600/10 border-amber-500/20 text-amber-100 rounded-tr-none'
                                : 'bg-slate-950 border-slate-850 text-slate-300 rounded-tl-none'
                            }`}
                          >
                            <div className="text-[9px] text-neutral-500 mb-1 flex items-center justify-between gap-4 font-bold">
                              <span>{isMe ? 'YOU' : msg.senderName.toUpperCase()}</span>
                              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendWhisper} className="pt-3 border-t border-slate-800/80 mt-auto">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={`Send a silent whisper to Captain ${selectedRecipient.username}...`}
                      value={whisperContent}
                      onChange={(e) => setWhisperContent(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 font-mono outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 text-slate-950 font-mono font-black text-xs p-2.5 rounded-xl transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl text-center flex flex-col items-center justify-center h-[400px]">
                <MessageSquare className="w-12 h-12 text-neutral-700 animate-bounce mb-3" />
                <h4 className="text-sm font-bold text-slate-300">Confidential Communications</h4>
                <p className="text-xs text-neutral-500 font-mono max-w-sm mt-1.5">
                  Select one of the dread Captains from the port roll on the left to read and write private, encrypted whispers.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
