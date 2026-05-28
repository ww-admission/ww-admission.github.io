<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppLog extends Model
{
    protected $fillable = [
        'action', 'description', 'actor_id', 'actor_name',
        'actor_role', 'target_id', 'target_type', 'meta',
    ];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public static function record(
        string $action,
        string $description,
        ?User $actor = null,
        ?string $targetId = null,
        ?string $targetType = null,
        ?array $meta = null,
    ): void {
        static::create([
            'action'      => $action,
            'description' => $description,
            'actor_id'    => $actor?->id,
            'actor_name'  => $actor?->name ?? 'Système',
            'actor_role'  => $actor?->role ?? 'system',
            'target_id'   => $targetId,
            'target_type' => $targetType,
            'meta'        => $meta,
        ]);
    }
}
