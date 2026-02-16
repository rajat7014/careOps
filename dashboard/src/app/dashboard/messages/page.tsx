'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Conversation {
  id: string;
  contact: { name: string; email: string };
  lastMessage: { content: string; createdAt: string } | null;
  messageCount: number;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Check for action=compose in URL
  useEffect(() => {
    if (searchParams.get('action') === 'compose') {
      setShowComposeModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      fetchConversations();
      fetchContacts();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: { conversations: Conversation[] } }>('/inbox/conversations');
      if (response.success) setConversations(response.data.conversations);
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Contact[] }>('/contacts');
      if (response.success) setContacts(response.data);
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !messageText.trim()) return;
    
    setSendError(null);
    setIsSending(true);
    
    try {
      // Determine if we should send email or SMS based on available info
      const hasEmail = !!selectedContact.email;
      const hasPhone = !!selectedContact.phone;
      
      if (!hasEmail && !hasPhone) {
        setSendError('Contact must have either email or phone number');
        setIsSending(false);
        return;
      }
      
      // Send message via API
      await api.post('/inbox/messages', {
        contactId: selectedContact.id,
        content: messageText,
        channel: hasEmail ? 'EMAIL' : 'SMS',
      });
      
      setMessageText('');
      setSelectedContact(null);
      setShowComposeModal(false);
      fetchConversations();
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">View and manage customer conversations</p>
        </div>
        <button
          onClick={() => setShowComposeModal(true)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md',
            'bg-primary text-primary-foreground font-medium',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <Icon name="Plus" size={16} />
          New Message
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Icon name="MessageSquare" className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No messages yet</h3>
          <p className="text-muted-foreground mt-1">Conversations will appear here</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {conversations.map((conv) => (
            <div key={conv.id} className="p-4 hover:bg-muted/50 cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{conv.contact.name}</h3>
                  <p className="text-sm text-muted-foreground">{conv.contact.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {conv.messageCount} messages
                </span>
              </div>
              {conv.lastMessage && (
                <p className="mt-2 text-sm text-muted-foreground truncate">
                  {conv.lastMessage.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Send Message</h2>
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setSelectedContact(null);
                  setMessageText('');
                  setSendError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            
            {sendError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {sendError}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Contact *</label>
                {contacts.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground">
                    No contacts available. <button type="button" onClick={() => router.push('/dashboard/contacts?action=add')} className="text-primary hover:underline">Add a contact first</button>
                  </div>
                ) : (
                  <select
                    value={selectedContact?.id || ''}
                    onChange={(e) => {
                      const contact = contacts.find(c => c.id === e.target.value);
                      setSelectedContact(contact || null);
                    }}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    required
                  >
                    <option value="">Select a contact...</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} {contact.email ? `(${contact.email})` : contact.phone ? `(${contact.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {selectedContact && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p><span className="font-medium">Email:</span> {selectedContact.email || 'Not available'}</p>
                  <p><span className="font-medium">Phone:</span> {selectedContact.phone || 'Not available'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Message will be sent via: {selectedContact.email ? 'Email' : selectedContact.phone ? 'SMS' : 'N/A'}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Message *</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowComposeModal(false);
                    setSelectedContact(null);
                    setMessageText('');
                    setSendError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-md border border-input hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !selectedContact || contacts.length === 0}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
