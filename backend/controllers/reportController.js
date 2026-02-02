const Task = require('../models/Task');
const User = require('../models/User');
const excelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const logger = require('../config/logger');
const { getOrgDomain, isPublicDomain, buildOrgEmailRegex } = require('../utils/domainHelper');
const { sendError, sendForbidden } = require('../utils/responseHelper');

// @desc Export all tasks as an Excel file (Org-based)
// @route GET /api/reports/export/tasks
// @access Private (Admin)
const { exportTasksReportService } = require('../services/reportService');
const { exportUsersReportService } = require('../services/userReportService');
const exportTasksReport = async(req, res) => {
    try {
        const workbook = await exportTasksReportService(req.user);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=tasks_report.xlsx`);
        return workbook.xlsx.write(res).then(() => res.status(200).end());
    } catch (error) {
        if (error.message && error.message.includes('Export not allowed')) {
            return sendForbidden(res, error.message);
        }
        sendError(res, 'Error exporting tasks', 500, error);
    }
};

// @desc Export user-tasks as an Excel file (Org-based)
// @route GET /api/reports/export/users
// @access Private (Admin)
const exportUsersReport = async (req, res) => {
    try {
        const workbook = await exportUsersReportService(req.user);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=user_tasks_report.xlsx`);
        return workbook.xlsx.write(res).then(() => res.status(200).end());
    } catch (error) {
        if (error.message && error.message.includes('Export not allowed')) {
            return sendForbidden(res, error.message);
        }
        sendError(res, 'Error exporting user tasks', 500, error);
    }
};

// @desc Export all tasks as a PDF file (Org-based)
// @route GET /api/reports/export/tasks/pdf
// @access Private (Admin)
const exportTasksPDF = async (req, res) => {
    try {
        const domain = getOrgDomain(req.user.email);
        if (isPublicDomain(domain)) {
            return sendForbidden(res, 'Export not allowed for public domain admins.');
        }

        const emailRegex = buildOrgEmailRegex(domain);
        const tasks = await Task.find()
            .populate({
                path: 'assignedTo',
                select: 'name email',
                match: { email: emailRegex }
            })
            .populate('createdBy', 'name')
            .sort({ dueDate: 1 });

        // Filter tasks that have assigned users from the org
        const orgTasks = tasks.filter(task => task.assignedTo && task.assignedTo.length > 0);

        // Create PDF document - landscape for better table display
        const doc = new PDFDocument({ 
            margin: 40, 
            size: 'A4',
            layout: 'landscape',
            autoFirstPage: true
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=tasks_report.pdf');
        doc.pipe(res);

        // Colors
        const colors = {
            primary: '#667eea',
            headerBg: '#f8fafc',
            border: '#e2e8f0',
            text: '#1e293b',
            textMuted: '#64748b',
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4',
            purple: '#8b5cf6'
        };

        const pageWidth = doc.page.width - 80; // Account for margins
        let currentPage = 1;

        // ===== HEADER SECTION =====
        doc.rect(0, 0, doc.page.width, 80).fill(colors.primary);
        doc.fontSize(28).fillColor('#ffffff').text('Work Track', 40, 25, { continued: false });
        doc.fontSize(12).fillColor('#ffffff').opacity(0.9).text('Tasks Report', 40, 55);
        doc.opacity(1);
        doc.fontSize(10).fillColor('#ffffff').text(
            new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            doc.page.width - 200,
            35,
            { width: 160, align: 'right' }
        );
        doc.moveDown(4);

        // ===== SUMMARY CARDS =====
        const summaryY = 100;
        const cardWidth = (pageWidth - 30) / 4;
        const cardHeight = 60;

        const pendingCount = orgTasks.filter(t => t.status === 'Pending').length;
        const inProgressCount = orgTasks.filter(t => t.status === 'In Progress').length;
        const completedCount = orgTasks.filter(t => t.status === 'Completed').length;

        const summaryCards = [
            { label: 'Total Tasks', value: orgTasks.length, color: colors.primary },
            { label: 'Pending', value: pendingCount, color: colors.purple },
            { label: 'In Progress', value: inProgressCount, color: colors.info },
            { label: 'Completed', value: completedCount, color: colors.success }
        ];

        summaryCards.forEach((card, i) => {
            const x = 40 + (i * (cardWidth + 10));
            doc.roundedRect(x, summaryY, cardWidth, cardHeight, 8).fill(card.color);
            doc.fontSize(24).fillColor('#ffffff').text(card.value.toString(), x + 15, summaryY + 12);
            doc.fontSize(10).fillColor('#ffffff').opacity(0.9).text(card.label, x + 15, summaryY + 40);
            doc.opacity(1);
        });

        doc.y = summaryY + cardHeight + 25;

        // ===== TASKS LIST (Card-based layout) =====
        orgTasks.forEach((task, index) => {
            // Calculate card height based on content
            const hasChecklist = task.todoChecklist && task.todoChecklist.length > 0;
            const checklistCount = hasChecklist ? task.todoChecklist.length : 0;
            const assigneeCount = task.assignedTo.length;
            const baseCardHeight = 100;
            const checklistHeight = hasChecklist ? Math.min(checklistCount * 14, 70) + 25 : 0;
            const assigneeHeight = assigneeCount * 12 + 10;
            const cardHeight2 = baseCardHeight + checklistHeight + assigneeHeight;

            // Check if we need a new page
            if (doc.y + cardHeight2 > doc.page.height - 60) {
                doc.addPage();
                currentPage++;
                doc.y = 40;
            }

            const cardY = doc.y;
            const cardX = 40;

            // Card background with left border
            doc.roundedRect(cardX, cardY, pageWidth, cardHeight2, 6).fill('#ffffff');
            doc.roundedRect(cardX, cardY, pageWidth, cardHeight2, 6).stroke(colors.border);
            
            // Left color bar based on status
            const statusBarColors = {
                'Pending': colors.purple,
                'In Progress': colors.info,
                'Completed': colors.success
            };
            doc.rect(cardX, cardY, 5, cardHeight2).fill(statusBarColors[task.status] || colors.textMuted);

            // Task number badge
            doc.roundedRect(cardX + 15, cardY + 10, 25, 20, 4).fill(colors.primary);
            doc.fontSize(10).fillColor('#ffffff').text((index + 1).toString(), cardX + 15, cardY + 15, { width: 25, align: 'center' });

            // Title
            doc.fontSize(13).fillColor(colors.text).font('Helvetica-Bold')
               .text(task.title, cardX + 50, cardY + 13, { width: pageWidth - 300 });
            doc.font('Helvetica');

            // Status and Priority badges
            const badgeY = cardY + 12;
            const statusBadgeX = pageWidth - 180;
            const priorityBadgeX = pageWidth - 90;

            // Status badge
            const statusColors2 = {
                'Pending': colors.purple,
                'In Progress': colors.info,
                'Completed': colors.success
            };
            doc.roundedRect(statusBadgeX, badgeY, 75, 18, 4).fill(statusColors2[task.status] || colors.textMuted);
            doc.fontSize(8).fillColor('#ffffff').text(task.status, statusBadgeX, badgeY + 5, { width: 75, align: 'center' });

            // Priority badge
            const priorityColors = {
                'High': colors.danger,
                'Medium': colors.warning,
                'Low': colors.success
            };
            doc.roundedRect(priorityBadgeX, badgeY, 60, 18, 4).fill(priorityColors[task.priority] || colors.textMuted);
            doc.fontSize(8).fillColor('#ffffff').text(task.priority, priorityBadgeX, badgeY + 5, { width: 60, align: 'center' });

            // Description (if exists)
            let contentY = cardY + 38;
            if (task.description) {
                const descText = task.description.length > 120 ? task.description.substring(0, 120) + '...' : task.description;
                doc.fontSize(9).fillColor(colors.textMuted).text(descText, cardX + 50, contentY, { width: pageWidth - 100 });
                contentY += 18;
            }

            // Due date and Progress row
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { 
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
            }) : 'No due date';
            
            doc.fontSize(9).fillColor(colors.primary).font('Helvetica-Bold').text('Due: ', cardX + 50, contentY, { continued: true });
            doc.font('Helvetica').fillColor(colors.textMuted).text(dueDate, { continued: false });

            // Progress bar
            const progressX = cardX + 280;
            const progressWidth = 120;
            const progress = task.progress || 0;
            doc.fillColor(colors.primary).font('Helvetica-Bold').text('Progress: ', progressX, contentY, { continued: false });
            doc.font('Helvetica');
            doc.roundedRect(progressX + 50, contentY + 2, progressWidth, 10, 3).fill('#e2e8f0');
            if (progress > 0) {
                const fillWidth = Math.max((progressWidth * progress) / 100, 5);
                doc.roundedRect(progressX + 50, contentY + 2, fillWidth, 10, 3).fill(colors.success);
            }
            doc.fontSize(8).fillColor(colors.text).text(`${progress}%`, progressX + progressWidth + 55, contentY + 1);

            contentY += 22;

            // Assigned To section with email
            doc.fontSize(9).fillColor(colors.primary).font('Helvetica-Bold').text('Assigned To:', cardX + 50, contentY);
            doc.font('Helvetica');
            contentY += 14;
            
            task.assignedTo.forEach(user => {
                doc.fontSize(8).fillColor(colors.text).text('  - ' + user.name, cardX + 55, contentY, { continued: true });
                doc.fillColor(colors.textMuted).text(' (' + user.email + ')', { continued: false });
                contentY += 12;
            });

            // Checklist section
            if (hasChecklist) {
                contentY += 5;
                const completedTodos = task.todoChecklist.filter(t => t.completed).length;
                doc.fontSize(9).fillColor(colors.primary).font('Helvetica-Bold').text('Checklist (' + completedTodos + '/' + checklistCount + ' completed):', cardX + 50, contentY);
                doc.font('Helvetica');
                contentY += 14;

                // Show checklist items (max 5)
                const displayItems = task.todoChecklist.slice(0, 5);
                displayItems.forEach(item => {
                    const checkIcon = item.completed ? '[x]' : '[ ]';
                    const textColor = item.completed ? colors.success : colors.textMuted;
                    doc.fontSize(8).fillColor(textColor).text('  ' + checkIcon + ' ' + item.text, cardX + 55, contentY, { 
                        width: pageWidth - 120,
                        lineBreak: false
                    });
                    contentY += 12;
                });

                if (checklistCount > 5) {
                    doc.fontSize(8).fillColor(colors.textMuted).text('     ... and ' + (checklistCount - 5) + ' more items', cardX + 55, contentY);
                }
            }

            doc.y = cardY + cardHeight2 + 10;
        });

        doc.end();

    } catch (error) {
        sendError(res, 'Error exporting tasks to PDF', 500, error);
    }
};

// Helper function to get team productivity data
const getTeamProductivityData = async (adminUser, period) => {
    const daysToAnalyze = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);
    startDate.setHours(0, 0, 0, 0);

    const domain = getOrgDomain(adminUser.email);
    if (isPublicDomain(domain)) {
        throw new Error('Export not allowed for public domain admins.');
    }

    const emailRegex = buildOrgEmailRegex(domain);
    const orgUsers = await User.find({
        email: emailRegex,
        role: { $ne: 'admin' }
    }).select('_id name email profileImageUrl').lean();

    const teamStats = await Promise.all(orgUsers.map(async (user) => {
        const allTasks = await Task.find({ assignedTo: user._id }).lean();
        
        const completedTasks = allTasks.filter(t => t.status === 'Completed');
        const completedInPeriod = allTasks.filter(task => 
            task.status === 'Completed' && 
            task.updatedAt >= startDate
        );

        const onTimeCompletions = completedTasks.filter(task => 
            task.dueDate && new Date(task.updatedAt) <= new Date(task.dueDate)
        ).length;
        const onTimeRate = completedTasks.length > 0 
            ? Math.round((onTimeCompletions / completedTasks.length) * 100) 
            : 0;

        const overdueTasks = allTasks.filter(task =>
            task.status !== 'Completed' &&
            task.dueDate &&
            new Date(task.dueDate) < new Date()
        ).length;

        let currentStreak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        while (currentStreak < 365) {
            const dayStart = new Date(checkDate);
            const dayEnd = new Date(checkDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const completedOnDay = allTasks.some(task =>
                task.status === 'Completed' &&
                new Date(task.updatedAt) >= dayStart &&
                new Date(task.updatedAt) <= dayEnd
            );
            
            if (completedOnDay) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        const totalTaskWeight = Math.min(allTasks.length / 10, 1) * 20;
        const completionRateWeight = (completedTasks.length / Math.max(allTasks.length, 1)) * 25;
        const onTimeWeight = onTimeRate * 0.25;
        const streakWeight = Math.min(currentStreak / 7, 1) * 15;
        
        let checklistTotal = 0;
        let checklistCompleted = 0;
        allTasks.forEach(task => {
            if (task.todoChecklist && task.todoChecklist.length > 0) {
                checklistTotal += task.todoChecklist.length;
                checklistCompleted += task.todoChecklist.filter(item => item.completed).length;
            }
        });
        const checklistRate = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
        const checklistWeight = checklistRate * 0.15;
        
        const productivityScore = Math.min(100, Math.round(
            totalTaskWeight + completionRateWeight + onTimeWeight + streakWeight + checklistWeight
        ));

        return {
            user,
            totalTasks: allTasks.length,
            completedTasks: completedTasks.length,
            completedInPeriod: completedInPeriod.length,
            pendingTasks: allTasks.filter(t => t.status === 'Pending').length,
            inProgressTasks: allTasks.filter(t => t.status === 'In Progress').length,
            overdueTasks,
            onTimeRate,
            currentStreak,
            productivityScore
        };
    }));

    teamStats.sort((a, b) => b.productivityScore - a.productivityScore);

    const teamAverage = {
        avgProductivityScore: teamStats.length > 0 
            ? Math.round(teamStats.reduce((sum, s) => sum + s.productivityScore, 0) / teamStats.length) 
            : 0,
        totalCompleted: teamStats.reduce((sum, s) => sum + s.completedInPeriod, 0),
        avgOnTimeRate: teamStats.length > 0 
            ? Math.round(teamStats.reduce((sum, s) => sum + s.onTimeRate, 0) / teamStats.length) 
            : 0,
        totalOverdue: teamStats.reduce((sum, s) => sum + s.overdueTasks, 0)
    };

    return { period: daysToAnalyze, teamSize: teamStats.length, teamAverage, members: teamStats };
};

// @desc Export team productivity as Excel
// @route GET /api/reports/export/team-productivity
// @access Private (Admin)
const exportTeamProductivity = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const data = await getTeamProductivityData(req.user, period);

        const workbook = new excelJS.Workbook();
        workbook.creator = 'Work Track';
        workbook.created = new Date();
        
        // ============ SUMMARY SHEET ============
        const summarySheet = workbook.addWorksheet('Summary', {
            properties: { tabColor: { argb: 'FF667eea' } }
        });

        // Title
        summarySheet.mergeCells('A1:D1');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = 'Team Productivity Report';
        titleCell.font = { size: 24, bold: true, color: { argb: 'FF667eea' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(1).height = 40;

        // Subtitle
        summarySheet.mergeCells('A2:D2');
        const subtitleCell = summarySheet.getCell('A2');
        subtitleCell.value = `Analysis Period: Last ${data.period} days | Generated: ${new Date().toLocaleString()}`;
        subtitleCell.font = { size: 11, color: { argb: 'FF6b7280' } };
        subtitleCell.alignment = { horizontal: 'center' };
        summarySheet.getRow(2).height = 25;

        // Empty row
        summarySheet.getRow(3).height = 15;

        // Key Metrics Header
        summarySheet.mergeCells('A4:D4');
        const metricsHeader = summarySheet.getCell('A4');
        metricsHeader.value = 'KEY METRICS';
        metricsHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        metricsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667eea' } };
        metricsHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(4).height = 30;

        // Metrics data
        const metricsData = [
            ['Team Size', data.teamSize, 'Total team members analyzed'],
            ['Average Productivity Score', `${data.teamAverage.avgProductivityScore}/100`, 'Weighted score based on completion, on-time rate, and activity'],
            ['Tasks Completed (Period)', data.teamAverage.totalCompleted, `Tasks completed in the last ${data.period} days`],
            ['Average On-Time Rate', `${data.teamAverage.avgOnTimeRate}%`, 'Percentage of tasks completed before due date'],
            ['Total Overdue Tasks', data.teamAverage.totalOverdue, 'Currently overdue tasks across all members'],
            ['Top Performer', data.members[0]?.user.name || 'N/A', data.members[0] ? `Score: ${data.members[0].productivityScore}` : ''],
            ['Lowest Performer', data.members[data.members.length - 1]?.user.name || 'N/A', data.members[data.members.length - 1] ? `Score: ${data.members[data.members.length - 1].productivityScore}` : ''],
        ];

        let rowNum = 5;
        metricsData.forEach((metric, idx) => {
            const row = summarySheet.getRow(rowNum);
            row.getCell(1).value = metric[0];
            row.getCell(2).value = metric[1];
            row.getCell(3).value = metric[2];
            row.getCell(1).font = { bold: true, color: { argb: 'FF374151' } };
            row.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF667eea' } };
            row.getCell(3).font = { italic: true, color: { argb: 'FF9ca3af' }, size: 10 };
            row.getCell(2).alignment = { horizontal: 'center' };
            if (idx % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
            row.height = 22;
            rowNum++;
        });

        // Score Distribution Section
        rowNum += 2;
        summarySheet.mergeCells(`A${rowNum}:D${rowNum}`);
        const distHeader = summarySheet.getCell(`A${rowNum}`);
        distHeader.value = 'SCORE DISTRIBUTION';
        distHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        distHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667eea' } };
        distHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(rowNum).height = 30;
        rowNum++;

        const scoreRanges = [
            { range: 'Excellent (80-100)', color: 'FF22c55e', count: data.members.filter(m => m.productivityScore >= 80).length },
            { range: 'Good (60-79)', color: 'FF84cc16', count: data.members.filter(m => m.productivityScore >= 60 && m.productivityScore < 80).length },
            { range: 'Average (40-59)', color: 'FFeab308', count: data.members.filter(m => m.productivityScore >= 40 && m.productivityScore < 60).length },
            { range: 'Below Average (20-39)', color: 'FFf97316', count: data.members.filter(m => m.productivityScore >= 20 && m.productivityScore < 40).length },
            { range: 'Needs Improvement (0-19)', color: 'FFef4444', count: data.members.filter(m => m.productivityScore < 20).length },
        ];

        scoreRanges.forEach(sr => {
            const row = summarySheet.getRow(rowNum);
            row.getCell(1).value = sr.range;
            row.getCell(2).value = sr.count;
            row.getCell(3).value = data.teamSize > 0 ? `${Math.round((sr.count / data.teamSize) * 100)}%` : '0%';
            row.getCell(1).font = { color: { argb: sr.color }, bold: true };
            row.getCell(2).font = { bold: true };
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(3).alignment = { horizontal: 'center' };
            row.height = 20;
            rowNum++;
        });

        // Set column widths for summary
        summarySheet.getColumn(1).width = 30;
        summarySheet.getColumn(2).width = 20;
        summarySheet.getColumn(3).width = 50;
        summarySheet.getColumn(4).width = 15;

        // ============ TEAM LEADERBOARD SHEET ============
        const membersSheet = workbook.addWorksheet('Team Leaderboard', {
            properties: { tabColor: { argb: 'FF22c55e' } }
        });

        // Title
        membersSheet.mergeCells('A1:L1');
        const leaderTitle = membersSheet.getCell('A1');
        leaderTitle.value = 'Team Performance Leaderboard';
        leaderTitle.font = { size: 20, bold: true, color: { argb: 'FF667eea' } };
        leaderTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        membersSheet.getRow(1).height = 35;

        // Column headers
        membersSheet.columns = [
            { key: 'rank', width: 8 },
            { key: 'medal', width: 8 },
            { key: 'name', width: 25 },
            { key: 'email', width: 35 },
            { key: 'score', width: 12 },
            { key: 'grade', width: 12 },
            { key: 'totalTasks', width: 12 },
            { key: 'completed', width: 14 },
            { key: 'pending', width: 12 },
            { key: 'inProgress', width: 14 },
            { key: 'overdue', width: 12 },
            { key: 'onTimeRate', width: 14 },
            { key: 'streak', width: 12 },
            { key: 'completionRate', width: 16 },
        ];

        // Header row
        const headerRow = membersSheet.getRow(3);
        const headers = ['Rank', '', 'Name', 'Email', 'Score', 'Grade', 'Total Tasks', 'Completed', 'Pending', 'In Progress', 'Overdue', 'On-Time %', 'Streak', 'Completion %'];
        headers.forEach((header, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667eea' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF4f46e5' } },
                bottom: { style: 'thin', color: { argb: 'FF4f46e5' } }
            };
        });
        headerRow.height = 28;

        // Data rows
        data.members.forEach((member, index) => {
            const row = membersSheet.getRow(index + 4);
            
            // Medal for top 3
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';

            // Grade based on score
            let grade = 'F';
            if (member.productivityScore >= 90) grade = 'A+';
            else if (member.productivityScore >= 80) grade = 'A';
            else if (member.productivityScore >= 70) grade = 'B+';
            else if (member.productivityScore >= 60) grade = 'B';
            else if (member.productivityScore >= 50) grade = 'C+';
            else if (member.productivityScore >= 40) grade = 'C';
            else if (member.productivityScore >= 30) grade = 'D';

            // Completion rate
            const completionRate = member.totalTasks > 0 
                ? Math.round((member.completedTasks / member.totalTasks) * 100) 
                : 0;

            row.values = [
                index + 1,
                medal,
                member.user.name,
                member.user.email,
                member.productivityScore,
                grade,
                member.totalTasks,
                member.completedInPeriod,
                member.pendingTasks,
                member.inProgressTasks,
                member.overdueTasks,
                `${member.onTimeRate}%`,
                `${member.currentStreak} days`,
                `${completionRate}%`
            ];

            // Styling
            row.height = 24;
            row.alignment = { vertical: 'middle' };
            
            // Alternating row colors
            if (index % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }

            // Score cell color
            const scoreCell = row.getCell(5);
            let scoreColor = 'FF22c55e';
            if (member.productivityScore < 80) scoreColor = 'FF84cc16';
            if (member.productivityScore < 60) scoreColor = 'FFeab308';
            if (member.productivityScore < 40) scoreColor = 'FFf97316';
            if (member.productivityScore < 20) scoreColor = 'FFef4444';
            scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: scoreColor } };
            scoreCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            scoreCell.alignment = { horizontal: 'center' };

            // Grade cell
            const gradeCell = row.getCell(6);
            gradeCell.font = { bold: true, color: { argb: scoreColor } };
            gradeCell.alignment = { horizontal: 'center' };

            // Overdue highlighting
            if (member.overdueTasks > 0) {
                const overdueCell = row.getCell(11);
                overdueCell.font = { bold: true, color: { argb: 'FFef4444' } };
                overdueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            }

            // Medal styling
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(3).alignment = { horizontal: 'left' };
            row.getCell(4).alignment = { horizontal: 'left' };

            // Top 3 highlighting
            if (index < 3) {
                row.font = { bold: true };
                const bgColors = ['FFFEF3C7', 'FFF3F4F6', 'FFFED7AA'];
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColors[index] } };
            }
        });

        // Add borders to data area
        for (let i = 3; i <= data.members.length + 3; i++) {
            for (let j = 1; j <= 14; j++) {
                membersSheet.getRow(i).getCell(j).border = {
                    top: { style: 'thin', color: { argb: 'FFe5e7eb' } },
                    bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } },
                    left: { style: 'thin', color: { argb: 'FFe5e7eb' } },
                    right: { style: 'thin', color: { argb: 'FFe5e7eb' } }
                };
            }
        }

        // ============ DETAILED ANALYSIS SHEET ============
        const analysisSheet = workbook.addWorksheet('Detailed Analysis', {
            properties: { tabColor: { argb: 'FFf97316' } }
        });

        // Title
        analysisSheet.mergeCells('A1:F1');
        const analysisTitle = analysisSheet.getCell('A1');
        analysisTitle.value = 'Detailed Member Analysis';
        analysisTitle.font = { size: 20, bold: true, color: { argb: 'FF667eea' } };
        analysisTitle.alignment = { horizontal: 'center' };
        analysisSheet.getRow(1).height = 35;

        let analysisRow = 3;
        data.members.forEach((member, index) => {
            // Member header
            analysisSheet.mergeCells(`A${analysisRow}:F${analysisRow}`);
            const memberHeader = analysisSheet.getCell(`A${analysisRow}`);
            memberHeader.value = `${index + 1}. ${member.user.name} (${member.user.email})`;
            memberHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            memberHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667eea' } };
            memberHeader.alignment = { vertical: 'middle' };
            analysisSheet.getRow(analysisRow).height = 28;
            analysisRow++;

            // Performance grade
            let grade = 'Needs Improvement';
            let gradeColor = 'FFef4444';
            if (member.productivityScore >= 80) { grade = 'Excellent'; gradeColor = 'FF22c55e'; }
            else if (member.productivityScore >= 60) { grade = 'Good'; gradeColor = 'FF84cc16'; }
            else if (member.productivityScore >= 40) { grade = 'Average'; gradeColor = 'FFeab308'; }
            else if (member.productivityScore >= 20) { grade = 'Below Average'; gradeColor = 'FFf97316'; }

            const memberDetails = [
                ['Productivity Score', `${member.productivityScore}/100`, 'Performance Grade', grade],
                ['Total Tasks Assigned', member.totalTasks, 'Tasks Completed (All Time)', member.completedTasks],
                ['Tasks Completed (Period)', member.completedInPeriod, 'Pending Tasks', member.pendingTasks],
                ['In Progress Tasks', member.inProgressTasks, 'Overdue Tasks', member.overdueTasks],
                ['On-Time Completion Rate', `${member.onTimeRate}%`, 'Current Streak', `${member.currentStreak} days`],
                ['Completion Rate', `${member.totalTasks > 0 ? Math.round((member.completedTasks / member.totalTasks) * 100) : 0}%`, 'Status', member.overdueTasks > 0 ? 'Attention Needed' : 'On Track'],
            ];

            memberDetails.forEach(detail => {
                const row = analysisSheet.getRow(analysisRow);
                row.getCell(1).value = detail[0];
                row.getCell(2).value = detail[1];
                row.getCell(4).value = detail[2];
                row.getCell(5).value = detail[3];
                
                row.getCell(1).font = { color: { argb: 'FF6b7280' } };
                row.getCell(2).font = { bold: true };
                row.getCell(4).font = { color: { argb: 'FF6b7280' } };
                row.getCell(5).font = { bold: true };

                // Color code grade
                if (detail[2] === 'Performance Grade') {
                    row.getCell(5).font = { bold: true, color: { argb: gradeColor } };
                }
                if (detail[3] === 'Attention Needed') {
                    row.getCell(5).font = { bold: true, color: { argb: 'FFef4444' } };
                } else if (detail[3] === 'On Track') {
                    row.getCell(5).font = { bold: true, color: { argb: 'FF22c55e' } };
                }

                row.height = 20;
                analysisRow++;
            });

            analysisRow += 2; // Space between members
        });

        analysisSheet.getColumn(1).width = 25;
        analysisSheet.getColumn(2).width = 18;
        analysisSheet.getColumn(3).width = 5;
        analysisSheet.getColumn(4).width = 25;
        analysisSheet.getColumn(5).width = 18;
        analysisSheet.getColumn(6).width = 15;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=team_productivity_${data.period}days.xlsx`);
        return workbook.xlsx.write(res).then(() => res.status(200).end());

    } catch (error) {
        sendError(res, 'Error exporting team productivity', 500, error);
    }
};

// @desc Export team productivity as PDF
// @route GET /api/reports/export/team-productivity/pdf
// @access Private (Admin)
const exportTeamProductivityPDF = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const data = await getTeamProductivityData(req.user, period);

        // Helper to ensure valid numbers
        const safeNum = (val, defaultVal = 0) => {
            const num = Number(val);
            return isNaN(num) || !isFinite(num) ? defaultVal : num;
        };

        // Safe data extraction at the start - BEFORE any PDF operations
        const teamSize = safeNum(data?.teamSize, 0);
        const avgScore = safeNum(data?.teamAverage?.avgProductivityScore, 0);
        const totalCompleted = safeNum(data?.teamAverage?.totalCompleted, 0);
        const avgOnTimeRate = safeNum(data?.teamAverage?.avgOnTimeRate, 0);
        const totalOverdue = safeNum(data?.teamAverage?.totalOverdue, 0);
        const periodDays = safeNum(data?.period, 30);
        const members = Array.isArray(data?.members) ? data.members : [];

        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 40,
            layout: 'portrait'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=team_productivity_${periodDays}days.pdf`);
        doc.pipe(res);

        // Use fixed page dimensions to avoid any NaN issues
        const pageWidth = 595;
        const pageHeight = 842;
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);

        // Colors
        const primaryColor = '#667eea';
        const successColor = '#10b981';
        const warningColor = '#f59e0b';
        const dangerColor = '#ef4444';
        const textColor = '#1e293b';
        const mutedColor = '#64748b';

        // ============ HEADER ============
        doc.rect(0, 0, pageWidth, 100).fill(primaryColor);
        
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#ffffff')
           .text('Team Productivity Report', margin, 35);
        
        doc.font('Helvetica').fontSize(11).fillColor('#e0e7ff')
           .text(`Analysis Period: Last ${periodDays} days | Generated: ${new Date().toLocaleDateString()}`, margin, 65);

        let y = 120;

        // ============ SUMMARY CARDS ============
        doc.font('Helvetica-Bold').fontSize(14).fillColor(textColor)
           .text('Summary', margin, y);
        y += 25;

        const cardData = [
            { label: 'Team Size', value: teamSize, color: primaryColor },
            { label: 'Avg Score', value: avgScore, color: avgScore >= 60 ? successColor : warningColor },
            { label: 'Completed', value: totalCompleted, color: successColor },
            { label: 'Overdue', value: totalOverdue, color: totalOverdue > 0 ? dangerColor : successColor }
        ];

        const cardWidth = (contentWidth - 30) / 4;
        cardData.forEach((card, i) => {
            const cardX = margin + i * (cardWidth + 10);
            
            doc.roundedRect(cardX, y, cardWidth, 60, 8).fill('#f8fafc');
            doc.roundedRect(cardX, y, 4, 60, 2).fill(card.color);
            
            doc.font('Helvetica-Bold').fontSize(22).fillColor(card.color)
               .text(String(card.value), cardX + 15, y + 12, { width: cardWidth - 20 });
            doc.font('Helvetica').fontSize(10).fillColor(mutedColor)
               .text(card.label, cardX + 15, y + 40, { width: cardWidth - 20 });
        });

        y += 80;

        // ============ ON-TIME RATE BAR ============
        doc.roundedRect(margin, y, contentWidth, 50, 8).fill('#f1f5f9');
        
        doc.font('Helvetica-Bold').fontSize(11).fillColor(textColor)
           .text('On-Time Completion Rate', margin + 15, y + 10);
        doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor)
           .text(`${avgOnTimeRate}%`, margin + contentWidth - 70, y + 8);
        
        // Progress bar
        doc.roundedRect(margin + 15, y + 32, contentWidth - 30, 10, 5).fill('#e2e8f0');
        const progressW = safeNum((contentWidth - 30) * avgOnTimeRate / 100, 0);
        if (progressW > 0) {
            doc.roundedRect(margin + 15, y + 32, Math.max(progressW, 10), 10, 5).fill(primaryColor);
        }

        y += 70;

        // ============ TEAM LEADERBOARD ============
        doc.font('Helvetica-Bold').fontSize(14).fillColor(textColor)
           .text(`Team Leaderboard (${members.length} members)`, margin, y);
        y += 25;

        // Table header
        doc.roundedRect(margin, y, contentWidth, 28, 4).fill('#f1f5f9');
        doc.font('Helvetica-Bold').fontSize(9).fillColor(mutedColor);
        doc.text('RANK', margin + 10, y + 9, { width: 40 });
        doc.text('NAME', margin + 55, y + 9, { width: 150 });
        doc.text('SCORE', margin + 210, y + 9, { width: 50, align: 'center' });
        doc.text('DONE', margin + 265, y + 9, { width: 45, align: 'center' });
        doc.text('PENDING', margin + 315, y + 9, { width: 55, align: 'center' });
        doc.text('OVERDUE', margin + 375, y + 9, { width: 55, align: 'center' });
        doc.text('ON-TIME', margin + 435, y + 9, { width: 55, align: 'center' });
        y += 32;

        // Table rows
        const maxRowsPerPage = 12;
        members.forEach((member, index) => {
            // Check if need new page
            if (index > 0 && index % maxRowsPerPage === 0) {
                doc.addPage();
                y = 50;
                
                doc.font('Helvetica-Bold').fontSize(14).fillColor(textColor)
                   .text('Team Leaderboard (continued)', margin, y);
                y += 25;
                
                doc.roundedRect(margin, y, contentWidth, 28, 4).fill('#f1f5f9');
                doc.font('Helvetica-Bold').fontSize(9).fillColor(mutedColor);
                doc.text('RANK', margin + 10, y + 9, { width: 40 });
                doc.text('NAME', margin + 55, y + 9, { width: 150 });
                doc.text('SCORE', margin + 210, y + 9, { width: 50, align: 'center' });
                doc.text('DONE', margin + 265, y + 9, { width: 45, align: 'center' });
                doc.text('PENDING', margin + 315, y + 9, { width: 55, align: 'center' });
                doc.text('OVERDUE', margin + 375, y + 9, { width: 55, align: 'center' });
                doc.text('ON-TIME', margin + 435, y + 9, { width: 55, align: 'center' });
                y += 32;
            }

            // Safe member data
            const name = member?.user?.name || 'Unknown';
            const email = member?.user?.email || '';
            const score = safeNum(member?.productivityScore, 0);
            const done = safeNum(member?.completedInPeriod, 0);
            const pending = safeNum(member?.pendingTasks, 0);
            const overdue = safeNum(member?.overdueTasks, 0);
            const onTime = safeNum(member?.onTimeRate, 0);

            // Row background
            let rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            if (index === 0) rowBg = '#fef3c7';
            else if (index === 1) rowBg = '#f1f5f9';
            else if (index === 2) rowBg = '#fed7aa';
            
            doc.roundedRect(margin, y, contentWidth, 40, 4).fill(rowBg);

            // Rank
            doc.font('Helvetica-Bold').fontSize(12).fillColor(index < 3 ? '#d97706' : mutedColor)
               .text(String(index + 1), margin + 10, y + 13, { width: 40 });

            // Name & Email
            doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor)
               .text(name, margin + 55, y + 8, { width: 150 });
            doc.font('Helvetica').fontSize(8).fillColor(mutedColor)
               .text(email, margin + 55, y + 22, { width: 150 });

            // Score badge
            let scoreColor = successColor;
            if (score < 60) scoreColor = warningColor;
            if (score < 40) scoreColor = dangerColor;
            
            doc.roundedRect(margin + 210, y + 10, 45, 20, 4).fill(scoreColor);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
               .text(String(score), margin + 210, y + 14, { width: 45, align: 'center' });

            // Stats
            doc.font('Helvetica-Bold').fontSize(11).fillColor(successColor)
               .text(String(done), margin + 265, y + 13, { width: 45, align: 'center' });
            doc.fillColor('#8b5cf6')
               .text(String(pending), margin + 315, y + 13, { width: 55, align: 'center' });
            
            if (overdue > 0) {
                doc.roundedRect(margin + 385, y + 8, 35, 22, 4).fill('#fee2e2');
            }
            doc.fillColor(overdue > 0 ? dangerColor : mutedColor)
               .text(String(overdue), margin + 375, y + 13, { width: 55, align: 'center' });
            
            doc.fillColor(primaryColor)
               .text(`${onTime}%`, margin + 435, y + 13, { width: 55, align: 'center' });

            y += 44;
        });

        doc.end();

    } catch (error) {
        logger.error('PDF Export Error:', error);
        if (!res.headersSent) {
            sendError(res, 'Error exporting team productivity PDF', 500, error);
        }
    }
};

module.exports = {
    exportTasksReport,
    exportUsersReport,
    exportTasksPDF,
    exportTeamProductivity,
    exportTeamProductivityPDF
};
