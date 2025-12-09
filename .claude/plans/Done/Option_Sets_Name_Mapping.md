# Option Sets Name Mapping

This document maps the original Bubble.io option set names to their corresponding Supabase reference table names.

## Quick Reference Table

| Bubble.io Name | Supabase Table | Description |
|----------------|----------------|-------------|
| #Bathrooms | `os_bathrooms` | Bathroom count options |
| #Bedrooms | `os_bedrooms` | Bedroom count options |
| #Beds | `os_beds` | Bed count options |
| #Qty Guests | `os_qty_guests` | Guest quantity options |
| #Roommates | `os_roommates` | Roommate count options |
| Admin Users | `os_admin_users` | Admin user configuration |
| AI fields (house manual) | `os_ai_fields_house_manual` | AI parsing fields for house manuals |
| AI Fields (Listing) | `os_ai_fields_listing` | AI parsing fields for listings |
| Alert Type | `os_alert_type` | UI alert types |
| Categories of Guest user Reviews | `os_categories_guest_user_reviews` | Guest review categories |
| Categories of House Manual Reviews | `os_categories_house_manual_reviews` | House manual review categories |
| Categories of Listings Reviews | `os_categories_listings_reviews` | Listing review categories |
| Categories of Stays Reviews | `os_categories_stays_reviews` | Stay review categories |
| ChatGPT Models | `os_chatgpt_models` | ChatGPT model configurations |
| Check-In and Check-Out Times | `os_check_in_out_times` | Check-in/out time options |
| Co-Host Status | `os_co_host_status` | Co-host request statuses |
| Communication Preference OS | `os_communication_preference` | Communication preference options |
| date change request status | `os_date_change_request_status` | Date change request statuses |
| Days | `os_days` | Days of the week |
| Filter - PriceonSearch | `os_price_filter` | Price filter ranges for search |
| house manual audiences | `os_house_manual_audiences` | House manual audience types |
| Ideal Split Preference | `os_ideal_split_preference` | Split preference options |
| Important Errors | `os_important_errors` | Listing error types |
| Kitchen Types | `os_kitchen_type` | Kitchen type options |
| Language | `os_language` | Supported languages |
| Messaging - Call to Action (CTA) | `os_messaging_cta` | Messaging call-to-action options |
| Modality | `os_modality` | Communication modality options |
| Multi Message Status | `os_multi_message_status` | Multi-message status options |
| Nights | `os_nights` | Nights of the week |
| Pages | `os_pages` | Application page references |
| Personas | `os_personas` | User persona types |
| Prompts | `os_prompts` | AI prompt templates |
| QR Code Use Cases | `os_qr_code_use_cases` | QR code use case types |
| receipt | `os_receipt` | Receipt templates |
| Referral Contact Methods | `os_referral_contact_methods` | Referral contact method options |
| Reminder Type | `os_reminder_type` | Reminder type options |
| Rental Type | `os_rental_type` | Rental type options |
| Review - Guest Questions | `os_review_guest_questions` | Guest review survey questions |
| Review - Host Questions | `os_review_host_questions` | Host review survey questions |
| Room Styles | `os_room_styles` | Room style options |
| Schedule Selection Types | `os_schedule_selection_types` | Schedule selection type options |
| Screen Size | `os_screen_size` | Screen size breakpoints |
| Slack Channels | `os_slack_channels` | Slack channel configurations |
| sortByPropertiesSearch | `os_sort_by_properties_search` | Search sort options |
| Status - Leases | `os_lease_status` | Lease status options |
| Status - Proposal | `os_proposal_status` | Proposal status options |
| Stay - Status | `os_stay_status` | Stay status options |
| Stay Periods (Reservation Span) | `os_stay_periods` | Stay period/duration options |
| sub-type of users | `os_user_subtype` | User subtype options |
| Task Load | `os_task_load` | Task load level options |
| Type of ZAT - FAQ | `os_faq_type` | FAQ category types |
| Type_ Amenity Categories | `os_amenity_categories` | Amenity category types |
| Type_ Gender | `os_gender_type` | Gender preference options |
| Type_ Legal Page | `os_legal_page_type` | Legal page types |
| Type_ Listing Photo | `os_listing_photo_type` | Listing photo types |
| Type_ Photo Evidence | `os_photo_evidence_type` | Photo evidence types |
| Type_ Review | `os_review_type` | Review types |
| Type_ Space | `os_space_type` | Space/listing types |
| Type_ Storage & Parking | `os_storage_parking_type` | Storage and parking options |
| Type_ Users | `os_user_type` | User type options |
| US States | `os_us_states` | US state options |
| Virtual Meeting Times | `os_virtual_meeting_times` | Virtual meeting time slots |
| Weekly Selection options | `os_weekly_selection_options` | Weekly selection pattern options |
| Assets - Color Pallete | `os_color_palette` | UI color definitions |
| Assets - Images | `os_images` | Image asset URLs |
| Assets - Split Lease Logos | `os_logos` | Logo image URLs |
| Assets - UI Icons | `os_ui_icons` | Icon image URLs |
| Co-Host/Split Lease Admins | `os_cohost_admins` | Admin contact and profile data |
| jingles samples | `os_jingles` | Audio jingle samples |
| Melodies Previews | `os_melodies` | Melody preview options |
| Narrators | `os_narrators` | AI narrator voice configurations |
| Proxy SMS Channels OS | `os_proxy_sms_channels` | SMS proxy channel phone numbers |
| Slack Webhooks | `os_slack_webhooks` | Slack webhook configurations |
| Split Lease Config | `os_split_lease_config` | App configuration settings |
| Twilio Numbers | `os_twilio_numbers` | Twilio phone number configurations |
| Video Animations | `os_video_animations` | Video animation assets |
| ZEP - Curation Parameters(OS) | `os_zep_curation_parameters` | Curation weighting parameters |
| zep-Type_ Postmark Webhook | `os_postmark_webhook` | Postmark webhook types |

## Tables by Category

### Numeric/Quantity Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| #Bathrooms | `os_bathrooms` |
| #Bedrooms | `os_bedrooms` |
| #Beds | `os_beds` |
| #Qty Guests | `os_qty_guests` |
| #Roommates | `os_roommates` |

### Status Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| Status - Proposal | `os_proposal_status` |
| Status - Leases | `os_lease_status` |
| Stay - Status | `os_stay_status` |
| Co-Host Status | `os_co_host_status` |
| date change request status | `os_date_change_request_status` |
| Multi Message Status | `os_multi_message_status` |

### User & Type Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| Type_ Users | `os_user_type` |
| sub-type of users | `os_user_subtype` |
| Admin Users | `os_admin_users` |
| Type_ Space | `os_space_type` |
| Type_ Gender | `os_gender_type` |
| Kitchen Types | `os_kitchen_type` |
| Rental Type | `os_rental_type` |
| Personas | `os_personas` |

### Review & Survey Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| Type_ Review | `os_review_type` |
| Review - Guest Questions | `os_review_guest_questions` |
| Review - Host Questions | `os_review_host_questions` |
| Categories of Guest user Reviews | `os_categories_guest_user_reviews` |
| Categories of House Manual Reviews | `os_categories_house_manual_reviews` |
| Categories of Listings Reviews | `os_categories_listings_reviews` |
| Categories of Stays Reviews | `os_categories_stays_reviews` |

### Time & Schedule Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| Days | `os_days` |
| Nights | `os_nights` |
| Check-In and Check-Out Times | `os_check_in_out_times` |
| Virtual Meeting Times | `os_virtual_meeting_times` |
| Stay Periods (Reservation Span) | `os_stay_periods` |
| Weekly Selection options | `os_weekly_selection_options` |
| Schedule Selection Types | `os_schedule_selection_types` |

### Content & Configuration Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| AI fields (house manual) | `os_ai_fields_house_manual` |
| AI Fields (Listing) | `os_ai_fields_listing` |
| house manual audiences | `os_house_manual_audiences` |
| Type_ Listing Photo | `os_listing_photo_type` |
| Type_ Photo Evidence | `os_photo_evidence_type` |
| Type_ Storage & Parking | `os_storage_parking_type` |
| Type_ Amenity Categories | `os_amenity_categories` |
| Room Styles | `os_room_styles` |
| Pages | `os_pages` |
| Prompts | `os_prompts` |
| Messaging - Call to Action (CTA) | `os_messaging_cta` |
| Reminder Type | `os_reminder_type` |
| QR Code Use Cases | `os_qr_code_use_cases` |
| Important Errors | `os_important_errors` |

### Reference/Lookup Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| US States | `os_us_states` |
| Language | `os_language` |
| Alert Type | `os_alert_type` |
| Modality | `os_modality` |
| Communication Preference OS | `os_communication_preference` |
| Ideal Split Preference | `os_ideal_split_preference` |
| Type_ Legal Page | `os_legal_page_type` |
| Type of ZAT - FAQ | `os_faq_type` |
| ChatGPT Models | `os_chatgpt_models` |
| Slack Channels | `os_slack_channels` |
| sortByPropertiesSearch | `os_sort_by_properties_search` |
| Filter - PriceonSearch | `os_price_filter` |
| Referral Contact Methods | `os_referral_contact_methods` |
| Screen Size | `os_screen_size` |
| Task Load | `os_task_load` |
| receipt | `os_receipt` |

### Asset & Media Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| Assets - Color Pallete | `os_color_palette` |
| Assets - Images | `os_images` |
| Assets - Split Lease Logos | `os_logos` |
| Assets - UI Icons | `os_ui_icons` |
| jingles samples | `os_jingles` |
| Melodies Previews | `os_melodies` |
| Narrators | `os_narrators` |
| Video Animations | `os_video_animations` |

### Configuration & Integration Options
| Bubble.io Name | Supabase Table |
|----------------|----------------|
| Co-Host/Split Lease Admins | `os_cohost_admins` |
| Proxy SMS Channels OS | `os_proxy_sms_channels` |
| Slack Webhooks | `os_slack_webhooks` |
| Split Lease Config | `os_split_lease_config` |
| Twilio Numbers | `os_twilio_numbers` |
| ZEP - Curation Parameters(OS) | `os_zep_curation_parameters` |
| zep-Type_ Postmark Webhook | `os_postmark_webhook` |

## Notes

- All Supabase tables use the `os_` prefix for easy identification
- All tables have Row Level Security (RLS) enabled with public read access
- Each table includes `id`, `name`, `display`, and `created_at` columns at minimum
- The `name` column is unique and used for programmatic lookups
- The `display` column contains the user-facing text

## Migration Date

Tables created: November 30, 2025
