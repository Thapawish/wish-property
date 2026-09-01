<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Contact extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'agency_id', 'type', 'first_name', 'last_name', 'email', 'phone',
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function propertiesAsLandlord()
    {
        return $this->hasMany(Property::class, 'landlord_id');
    }

    public function leasesAsTenant()
    {
        return $this->hasMany(Lease::class, 'tenant_id');
    }
}
