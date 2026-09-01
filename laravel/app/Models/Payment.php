<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Payment extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'agency_id', 'lease_id',
        'amount', 'due_date', 'paid_date',
        'status', 'method', 'reference',
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
