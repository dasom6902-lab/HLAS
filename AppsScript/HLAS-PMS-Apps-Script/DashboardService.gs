/**
 * HLAS 운영 현황 KPI를 생성한다.
 *
 * 각 엔티티 시트는 한 번만 읽고 이후 상태·우선순위·진행률은
 * 메모리에서 집계한다.
 *
 * @return {Object} Core API 표준 응답
 */
function getDashboard() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
    const C = HLAS_CONSTANTS;
    const projects = SheetRepository.findAll(C.SHEETS.PROJECT);
    const epics = SheetRepository.findAll(C.SHEETS.EPIC);
    const features = SheetRepository.findAll(C.SHEETS.FEATURE);
    const functions = SheetRepository.findAll(C.SHEETS.FUNCTION);
    const tasks = SheetRepository.findAll(C.SHEETS.TASK);

    const status = { todo: 0, doing: 0, done: 0, hold: 0 };
    const priority = { urgent: 0, high: 0, normal: 0, low: 0 };

    tasks.forEach(function (task) {
      const taskStatus = String(task[C.FIELD.TASK.STATUS] || '').trim();
      if (!taskStatus || taskStatus === '대기') status.todo += 1;
      else if (taskStatus === C.STATUS.IN_PROGRESS) status.doing += 1;
      else if (taskStatus === C.STATUS.COMPLETED) status.done += 1;
      else if (taskStatus === C.STATUS.ON_HOLD) status.hold += 1;

      const taskPriority = String(task[C.FIELD.TASK.PRIORITY] || '').trim();
      if (taskPriority === C.PRIORITY.URGENT) priority.urgent += 1;
      else if (taskPriority === C.PRIORITY.HIGH) priority.high += 1;
      else if (taskPriority === C.PRIORITY.NORMAL) priority.normal += 1;
      else if (taskPriority === C.PRIORITY.LOW) priority.low += 1;
    });

    const epicProjectMap = {};
    epics.forEach(function (epic) {
      epicProjectMap[String(epic.EPIC_ID || '')] = String(epic.PROJECT_ID || '');
    });
    const projectTaskStats = {};
    projects.forEach(function (project) {
      projectTaskStats[String(project.PROJECT_ID || '')] = { total: 0, done: 0 };
    });
    tasks.forEach(function (task) {
      const projectId = epicProjectMap[String(task[C.FIELD.TASK.EPIC_ID] || '')];
      if (!projectId || !projectTaskStats[projectId]) return;
      projectTaskStats[projectId].total += 1;
      if (String(task[C.FIELD.TASK.STATUS] || '') === C.STATUS.COMPLETED) {
        projectTaskStats[projectId].done += 1;
      }
    });

    const projectProgress = projects.map(function (project) {
      const id = String(project.PROJECT_ID || '');
      const stats = projectTaskStats[id] || { total: 0, done: 0 };
      return {
        id: id,
        name: String(project['프로젝트명'] || ''),
        progress: stats.total ? Math.round(stats.done * 100 / stats.total) : 0,
        completedTasks: stats.done,
        totalTasks: stats.total,
      };
    });

    const legacyDashboard = {
      summary: {
        projectCount: projects.length,
        epicCount: epics.length,
        featureCount: features.length,
        functionCount: functions.length,
        taskCount: tasks.length,
      },
      status: status,
      priority: priority,
      progress: { project: projectProgress },
    };
    const analyticsDashboard = buildAnalyticsDashboard_();
    legacyDashboard.kpi = analyticsDashboard.kpi;
    legacyDashboard.analytics = analyticsDashboard.analytics;
    legacyDashboard.recent = analyticsDashboard.recent;
    writeAnalyticsAudit_(
      C.AUDIT_ACTION.DASHBOARD, '', C.AUDIT_RESULT.SUCCESS, 'KPI Dashboard 조회'
    );
    return legacyDashboard;
  }, { operation: 'getDashboard' });
}
