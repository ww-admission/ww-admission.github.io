<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) ($request->per_page ?? 30), 100);

        $paginator = User::orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json(
            $paginator->through(fn (User $u) => [
                'id'        => $u->id,
                'name'      => $u->name,
                'email'     => $u->email,
                'role'      => $u->role,
                'status'    => $u->status ?? 'active',
                'createdAt' => $u->created_at,
                'updatedAt' => $u->updated_at,
            ])
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'role' => 'sometimes|in:admin,candidate',
        ]);

        $user = User::findOrFail($id);

        if ($request->has('role')) {
            $user->role = $request->role;
            $user->save();
        }

        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'createdAt' => $user->created_at,
        ]);
    }
}
