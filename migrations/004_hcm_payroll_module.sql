CREATE TABLE IF NOT EXISTS hr_employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES master_employee(id) ON DELETE CASCADE,
    bank_account_number VARCHAR(100) NOT NULL,
    bank_ifsc VARCHAR(50) NOT NULL,
    pan_ssn_number VARCHAR(50) NOT NULL,
    basic_salary NUMERIC(15, 2) NOT NULL CHECK (basic_salary >= 0),
    allowances NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (allowances >= 0),
    emergency_contact JSONB NOT NULL,
    documents_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_hr_employee UNIQUE (tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_id ON hr_employee_profiles (employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_gin ON hr_employee_profiles USING GIN (documents_json);

CREATE TABLE IF NOT EXISTS biometric_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES master_employee(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES master_project(id) ON DELETE RESTRICT,
    device_id VARCHAR(100) NOT NULL,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    verification_mode VARCHAR(50) NOT NULL CHECK (verification_mode IN ('BIOMETRIC', 'FACIAL', 'GPS_MOBILE', 'MANUAL')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'OVERTIME')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON biometric_attendance_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_project ON biometric_attendance_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_status ON biometric_attendance_logs (tenant_id, status);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    payroll_code VARCHAR(100) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_gross_pay NUMERIC(15, 2) NOT NULL CHECK (total_gross_pay >= 0),
    total_deductions NUMERIC(15, 2) NOT NULL CHECK (total_deductions >= 0),
    total_net_pay NUMERIC(15, 2) NOT NULL CHECK (total_net_pay >= 0),
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'PROCESSING', 'APPROVED', 'DISBURSED', 'CANCELLED')),
    approved_by UUID REFERENCES master_employee(id) ON DELETE RESTRICT,
    payroll_summary_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payroll_code UNIQUE (tenant_id, payroll_code)
);

CREATE INDEX IF NOT EXISTS idx_payroll_tenant_status ON payroll_runs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_summary_gin ON payroll_runs USING GIN (payroll_summary_json);

CREATE TABLE IF NOT EXISTS ats_job_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    applicant_code VARCHAR(100) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('APPLIED', 'SCREENED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED')),
    interview_score NUMERIC(5, 2) CHECK (interview_score >= 0.00 AND interview_score <= 100.00),
    resume_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ats_applicant UNIQUE (tenant_id, applicant_code)
);

CREATE INDEX IF NOT EXISTS idx_ats_tenant_status ON ats_job_applicants (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ats_resume_gin ON ats_job_applicants USING GIN (resume_metadata);
