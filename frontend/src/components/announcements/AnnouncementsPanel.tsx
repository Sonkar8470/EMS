import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { announcementsAPI } from "@/services/api";
import { getSocket } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

type Announcement = {
  _id: string;
  title: string;
  message: string;
  pinned?: boolean;
  createdAt: string;
  createdBy?: { name?: string } | string;
};

export default function AnnouncementsPanel({ variant }: { variant: "admin" | "employee" }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === "admin" && variant === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await announcementsAPI.list();
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    const onCreated = () => load();
    const onUpdated = () => load();
    const onDeleted = () => load();
    socket.on("announcementCreated", onCreated);
    socket.on("announcementUpdated", onUpdated);
    socket.on("announcementDeleted", onDeleted);
    return () => {
      socket.off("announcementCreated", onCreated);
      socket.off("announcementUpdated", onUpdated);
      socket.off("announcementDeleted", onDeleted);
    };
  }, []);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return;
    await announcementsAPI.create({ title, message, pinned });
    setTitle("");
    setMessage("");
    setPinned(false);
    load();
  };

  const togglePin = async (id: string, value: boolean) => {
    await announcementsAPI.update(id, { pinned: value });
    load();
  };

  const remove = async (id: string) => {
    await announcementsAPI.remove(id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="space-y-2">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Write an announcement..." value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                Pin to top
              </label>
              <Button size="sm" onClick={submit} disabled={loading}>Post</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground">No announcements</div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a._id} className="p-3 rounded border bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{a.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant={a.pinned ? "secondary" : "outline"} onClick={() => togglePin(a._id, !a.pinned)}>
                        {a.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(a._id)}>Delete</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


