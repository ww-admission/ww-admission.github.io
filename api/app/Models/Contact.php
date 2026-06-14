<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'type', 'name', 'first_name', 'last_name', 'role', 'email', 'phone',
        'location', 'bio', 'website', 'avatar_url', 'languages', 'availability',
        'specializations', 'linkedin_url', 'status', 'is_default', 'conversation_id', 'tags',
    ];

    protected $casts = [
        'languages'       => 'array',
        'specializations' => 'array',
        'tags'            => 'array',
        'is_default'      => 'boolean',
    ];

    protected $appends = ['initials', 'avatar_color'];

    public function getInitialsAttribute(): string
    {
        $parts = explode(' ', trim($this->name));
        return strtoupper(($parts[0][0] ?? '') . ($parts[1][0] ?? ''));
    }

    public function getAvatarColorAttribute(): string
    {
        $colors = [
            'bg-primary-500', 'bg-primary-700', 'bg-gold-600',
            'bg-neutral-500', 'bg-neutral-600', 'bg-neutral-700',
        ];
        return $colors[$this->id % count($colors)];
    }
}
