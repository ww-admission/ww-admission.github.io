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

        $logs = AppLog::latest()->limit(200)->get()->map(fn ($l) => [
            'id'          => $l->id,
            'action'      => $l->action,
            'description' => $l->description,
            'actorName'   => $l->actor_name,
            'actorRole'   => $l->actor_role,
            'targetId'    => $l->target_id,
            'targetType'  => $l->target_type,
            'meta'        => $l->meta,
            'createdAt'   => $l->created_at,
        ]);

        return response()->json($logs);
    }
}
