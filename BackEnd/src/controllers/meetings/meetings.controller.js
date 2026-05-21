import pool from '../../config/db.js';

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

    const [result] = await pool.execute(
      `INSERT INTO meeting_records
         (leader_id, employee_id, meeting_date, commitments, leader_feedback, employee_feedback, next_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        leaderId, employeeId, meetingDate,
        commitments     ? JSON.stringify(commitments)     : null,
        leaderFeedback  ? JSON.stringify(leaderFeedback)  : null,
        employeeFeedback? JSON.stringify(employeeFeedback): null,
        nextSteps ?? null,
      ]
    );

    res.status(201).json({ success: true, message: 'Reunión registrada', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/meetings/records/:employeeId ──────────────────────────────────
export const getHistory = async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const leaderId   = req.user.id;

    const [rows] = await pool.execute(
      `SELECT mr.id, mr.meeting_date, mr.commitments, mr.leader_feedback,
              mr.employee_feedback, mr.next_steps, mr.ai_summary, mr.created_at,
              lu.name AS leader_name, eu.name AS employee_name
       FROM   meeting_records mr
       JOIN   users lu ON mr.leader_id   = lu.id
       JOIN   users eu ON mr.employee_id = eu.id
       WHERE  mr.employee_id = ? AND mr.leader_id = ?
       ORDER  BY mr.meeting_date DESC`,
      [employeeId, leaderId]
    );

    const parsed = rows.map((r) => ({
      ...r,
      commitments:      r.commitments       ? (Array.isArray(r.commitments)       ? r.commitments       : JSON.parse(r.commitments))       : [],
      leaderFeedback:   r.leader_feedback   ? (typeof r.leader_feedback   === 'object' ? r.leader_feedback   : JSON.parse(r.leader_feedback))   : null,
      employeeFeedback: r.employee_feedback ? (typeof r.employee_feedback === 'object' ? r.employee_feedback : JSON.parse(r.employee_feedback)) : null,
    }));

    res.json({ success: true, data: { employeeId, total: parsed.length, records: parsed } });
  } catch (error) {
    next(error);
  }
};
