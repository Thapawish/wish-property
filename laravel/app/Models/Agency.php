<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Agency extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['name', 'slug', 'plan'];

    public function members()
    {
        return $this->hasMany(AgencyMember::class);
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }

    public function properties()
    {
        return $this->hasMany(Property::class);
    }

    public function leases()
    {
        return $this->hasMany(Lease::class);
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
