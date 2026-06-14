<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($n) => $this->format($n));

        return response()->json([
            'notifications' => $notifications,
            'unreadCount'   => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    private function format(DatabaseNotification $n): array
    {
        return [
            'id'        => $n->id,
            'type'      => $n->type,
            'data'      => $n->data,
            'read'      => ! is_null($n->read_at),
            'readAt'    => $n->read_at,
            'createdAt' => $n->created_at,
        ];
    }
}
