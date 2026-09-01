<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Property extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'agency_id',
        'address', 'suburb', 'state', 'postcode',
        'property_type', 'status',
        'bedrooms', 'bathrooms', 'parking',
        'landlord_id',
        'management_gained_reason', 'gained_reason_source',
        'property_category', 'property_aspect',
        'has_aircon', 'has_garden', 'has_built_ins', 'has_internal_laundry',
        'has_balcony', 'has_gas_cooking', 'has_electric_cooking',
        'has_dishwasher', 'has_stairs', 'has_lift',
        'ownership_type', 'split_payments',
        'owner_first_name', 'owner_last_name', 'owner_email', 'owner_mobile',
        'management_fee_percent', 'letting_fee', 'lease_renewal_fee',
        'advertising_fee', 'approved_maintenance_spend',
        'admin_fee', 'admin_fee_charge_date', 'do_not_charge_admin_fee_if_vacant',
    ];

    protected $casts = [
        'has_aircon' => 'boolean',
        'has_garden' => 'boolean',
        'has_built_ins' => 'boolean',
        'has_internal_laundry' => 'boolean',
        'has_balcony' => 'boolean',
        'has_gas_cooking' => 'boolean',
        'has_electric_cooking' => 'boolean',
        'has_dishwasher' => 'boolean',
        'has_stairs' => 'boolean',
        'has_lift' => 'boolean',
        'split_payments' => 'boolean',
        'do_not_charge_admin_fee_if_vacant' => 'boolean',
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function landlord()
    {
        return $this->belongsTo(Contact::class, 'landlord_id');
    }

    public function leases()
    {
        return $this->hasMany(Lease::class);
    }
}
