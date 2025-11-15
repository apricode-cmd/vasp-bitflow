/**
 * Order Notes Tab
 * Admin notes and internal communication
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/formatters';
import { 
  MessageSquare,
  Save,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderNotesTabProps {
  order: {
    id: string;
    adminNotes?: string | null;
  };
  onSaveNotes?: (notes: string) => Promise<void>;
}

export function OrderNotesTab({ order, onSaveNotes }: OrderNotesTabProps): JSX.Element {
  const [notes, setNotes] = useState(order.adminNotes || '');
  const [isEditing, setIsEditing] = useState(!order.adminNotes);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSaveNotes) {
      toast.error('Save function not provided');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveNotes(notes);
      toast.success('Notes saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(order.adminNotes || '');
    setIsEditing(false);
  };

  const wordCount = notes.trim().split(/\s+/).filter(Boolean).length;
  const charCount = notes.length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Admin Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Internal notes and comments about this order. Only visible to admins.
          </p>
        </CardContent>
      </Card>

      {/* Notes Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notes</h3>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this order..."
                rows={10}
                className="resize-none"
              />
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {wordCount} words • {charCount} characters
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {notes ? (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h4 className="font-semibold mb-2">No Notes Yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add internal notes to keep track of important information about this order.
                  </p>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Add Notes
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-1">1</Badge>
            <p className="text-sm text-muted-foreground">
              Include any special instructions or customer requests
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-1">2</Badge>
            <p className="text-sm text-muted-foreground">
              Document any issues or discrepancies found
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-1">3</Badge>
            <p className="text-sm text-muted-foreground">
              Record communication with the customer
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-1">4</Badge>
            <p className="text-sm text-muted-foreground">
              Note any manual actions taken
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

