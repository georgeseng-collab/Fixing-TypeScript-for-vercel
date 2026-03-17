// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getApplicants = async () => {
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addApplicant = async (formData: any, file: File) => {
  // 1. Upload Resume
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `resumes/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('resumes')
    .getPublicUrl(filePath);

  // 2. Save Record
  const { error: dbError } = await supabase.from('applicants').insert([
    {
      ...formData,
      resume_metadata: { url: publicUrl, path: filePath },
      status_history: [{ status: formData.status, date: new Date().toISOString() }]
    }
  ]);

  if (dbError) throw dbError;
};

export const updateApplicantStatus = async (id: string, newStatus: string, history: any[]) => {
  const updatedHistory = [...(history || []), { status: newStatus, date: new Date().toISOString() }];
  const { error } = await supabase
    .from('applicants')
    .update({ status: newStatus, status_history: updatedHistory })
    .eq('id', id);
  if (error) throw error;
};

// NEW: Delete Function (Storage + DB)
export const deleteApplicant = async (id: string, resumePath: string) => {
  if (resumePath) {
    await supabase.storage.from('resumes').remove([resumePath]);
  }
  const { error } = await supabase.from('applicants').delete().eq('id', id);
  if (error) throw error;
};