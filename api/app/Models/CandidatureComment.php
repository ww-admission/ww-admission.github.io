<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CandidatureComment extends Model
{
    protected $fillable = ['candidature_id', 'user_id', 'content'];

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function candidature()
    {
        return $this->belongsTo(Candidature::class);
    }
}
