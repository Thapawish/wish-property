<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RentReview extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'agency_id', 'lease_id',
        'review_date', 'current_rent', 'proposed_rent',
        'approved_rent', 'status', 'notes',
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function lease()
    {
        return $this->belongsTo(Lease::class);
    }
}
