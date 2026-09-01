<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AgencyMember extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['agency_id', 'user_id', 'role'];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }
}
