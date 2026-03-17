import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export const getApplicants = async () => {
  const { data, error } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addApplicant = async (applicantData: any, resumeFile: File | null) => {
  let resume_metadata = null;
  if (resumeFile) {
    const filePath = `${Date.now()}_${resumeFile.name.replace(/\s+/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('resumes').upload(filePath, resumeFile);
    if (uploadError) throw uploadError;
    resume_metadata = { path: uploadData.path, name: resumeFile.name };
  }
  const dbPayload = {
    ...applicantData, resume_metadata,
    status_history: [{ status: applicantData.status, timestamp: new Date().toISOString() }]
  };
  const { data, error } = await supabase.from('applicants').insert([dbPayload]).select();
  if (error) throw error;
  return data[0];
};

// UPDATED: Now accepts extra data like left_date and remarks
export const updateApplicantStatus = async (id: string, newStatus: string, currentHistory: any[] = [], extraData: any = {}) => {
  const updatedHistory = [...currentHistory, { status: newStatus, timestamp: new Date().toISOString() }];
  const payload = { status: newStatus, status_history: updatedHistory, ...extraData };
  
  const { data, error } = await supabase.from('applicants').update(payload).eq('id', id).select();
  if (error) throw error;
  return data[0];
};