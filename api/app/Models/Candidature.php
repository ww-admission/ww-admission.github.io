<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Candidature extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'destination', 'programme', 'niveau_vise', 'status',
        'personal_info', 'academic_info', 'documents', 'complementary_info', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'personal_info'      => 'array',
            'academic_info'      => 'array',
            'documents'          => 'array',
            'complementary_info' => 'array',
            'submitted_at'       => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function comments()
    {
        return $this->hasMany(CandidatureComment::class)->latest();
    }

    public function conversation()
    {
        return $this->hasOne(Conversation::class);
    }
}
