'use client';

import Image from 'next/image';
import { useState, RefObject } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Comment } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CommentsSectionProps {
  comments: Comment[];
  onAddComment?: (text: string) => void;
  commentInputRef?: RefObject<HTMLInputElement | null>;
}

export function CommentsSection({ comments, onAddComment, commentInputRef }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment?.(newComment);
      setNewComment('');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Comments ({comments.length})</h3>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={commentInputRef}
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 border-0 focus:ring-2 focus:ring-amber-500 focus:outline-none text-zinc-900 dark:text-white placeholder:text-zinc-500"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim()} className="rounded-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Comments List */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-4 pr-4">
          {comments.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                  <Image
                    src={comment.userAvatar}
                    alt={comment.userName}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm text-zinc-900 dark:text-white">{comment.userName}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-zinc-700 dark:text-zinc-300">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

