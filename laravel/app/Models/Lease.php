<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Lease extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'agency_id', 'property_id', 'tenant_id',
        'start_date', 'end_date',
        'rent_amount', 'bond_amount', 'status',
        'payment_frequency', 'first_payment_date', 'paid_until',
        'next_inspection_months', 'next_rent_review_months',
        'gst_included', 'tenant_pays_water', 'is_periodic',
        'internal_notes',
    ];

    protected $casts = [
        'gst_included' => 'boolean',
        'tenant_pays_water' => 'boolean',
        'is_periodic' => 'boolean',
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Contact::class, 'tenant_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function rentReviews()
    {
        return $this->hasMany(RentReview::class);
    }
}
