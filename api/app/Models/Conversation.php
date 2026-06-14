<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = ['candidate_id', 'candidature_id'];

    public function candidate()
    {
        return $this->belongsTo(User::class, 'candidate_id');
    }

    public function candidature()
    {
        return $this->belongsTo(Candidature::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class)->oldest();
    }

    public function lastMessage()
    {
        return $this->hasOne(Message::class)->latest();
    }

    public function unreadCountFor(User $user): int
    {
        return $this->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();
    }
}
