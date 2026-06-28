import supabase from '../../config/supabaseClient.js';

// ── POST /api/v1/meetings/records ─────────────────────────────────────────────
export const createRecord = async (req, res, next) => {
  try {
    const {
      employeeId, meetingDate, commitments,
      leaderFeedback, employeeFeedback, nextSteps,
    } = req.body;
    const leaderId = req.user.id;

    if (!employeeId || !meetingDate) {
      const err = new Error('employeeId y meetingDate son requeridos');
      err.status = 400;
      return next(err);
    }

    const { data, error } = await supabase.from('meeting_records').insert({
      leader_id: leaderId, employee_id: employeeId, meeting_date: meetingDate,
      commitments: commitments ?? null,
      leader_feedback: leaderFeedback ?? null,
      employee_feedback: employeeFeedback ?? null,
      next_steps: nextSteps ?? null,
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({ success: true, message: 'Reunión registrada', data: { id: data.id } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/meetings/records/:employeeId ──────────────────────────────────
export const getHistory = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;
    const leaderId    = req.user.id;

    const { data, error } = await supabase
      .from('meeting_records')
      .select(`
        id, meeting_date, commitments, leader_feedback, employee_feedback, next_steps, ai_summary, created_at,
        leader:profiles!meeting_records_leader_id_fkey(name),
        employee:profiles!meeting_records_employee_id_fkey(name)
      `)
      .eq('employee_id', employeeId)
      .eq('leader_id', leaderId)
      .order('meeting_date', { ascending: false });
    if (error) throw error;

    const parsed = data.map((r) => ({
      id: r.id, meeting_date: r.meeting_date, next_steps: r.next_steps, ai_summary: r.ai_summary,
      created_at: r.created_at, leader_name: r.leader?.name, employee_name: r.employee?.name,
      commitments: r.commitments ?? [],
      leaderFeedback: r.leader_feedback ?? null,
      employeeFeedback: r.employee_feedback ?? null,
    }));

    res.json({ success: true, data: { employeeId, total: parsed.length, records: parsed } });
  } catch (error) {
    next(error);
  }
};
