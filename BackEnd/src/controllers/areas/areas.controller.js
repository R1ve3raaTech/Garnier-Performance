import supabase from '../../config/supabaseClient.js';

export const getAreas = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('areas').select('id, name').order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
