"use client";

import React from "react";
import { CorporatePageHeader } from "@/components/core/CorporatePageHeader";
import { UserProfileView } from "@/components/modules/profile/UserProfileView";

export default function ProfilePage() {
  return (
    <div className="space-y-6 pb-8">
      <CorporatePageHeader
        title="Security & User Profile Workspace"
        badgeText="IDENTITY CONTROL"
      />

      <UserProfileView />
    </div>
  );
}

