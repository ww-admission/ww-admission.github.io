<?php

namespace App\Http\Controllers;

use App\Models\AppLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $perPage = min((int) ($request->per_page ?? 30), 100);

        $query = AppLog::latest();

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('action', 'like', $request->category . '.%');
        }

        return response()->json(
            $query->paginate($perPage)->through(fn ($l) => [
                'id'          => $l->id,
                'action'      => $l->action,
                'description' => $l->description,
                'actorName'   => $l->actor_name,
                'actorRole'   => $l->actor_role,
                'targetId'    => $l->target_id,
                'targetType'  => $l->target_type,
                'meta'        => $l->meta,
                'createdAt'   => $l->created_at,
            ])
        );
    }
}
