-- =============================================
-- 智慧物流管理系统 - SQL Server完整脚本
-- 执行环境：SQL Server 2017/2019
-- 执行说明：从上到下逐段执行（GO为批处理分隔符），无报错即部署成功
-- 作者：曾睿 交付日期：2025.12.25
-- =============================================

-- ==================== 1.建库建表 ====================
-- 1.1 创建数据库（指定中文字符集，避免乱码）
CREATE DATABASE LogisticsDB
COLLATE Chinese_PRC_CI_AS;
GO

USE LogisticsDB;
GO

-- 1.2 配送中心表（无外键，优先创建）
CREATE TABLE DistributionCenter (
    DC_ID VARCHAR(10) PRIMARY KEY,
    DC_Name VARCHAR(50) NOT NULL,
    Region VARCHAR(30) NOT NULL,
    Address VARCHAR(100) NOT NULL,
    Contact_Phone VARCHAR(11) NOT NULL
);
GO

-- 1.3 司机表（先创建，因车队表关联司机）
CREATE TABLE Driver (
    Driver_ID VARCHAR(10) PRIMARY KEY,
    Driver_Name VARCHAR(20) NOT NULL,
    License_Level VARCHAR(1) NOT NULL CHECK (License_Level IN ('A','B','C')),
    Contact VARCHAR(11) NOT NULL,
    Hire_Date DATE NOT NULL,
    Fleet_ID VARCHAR(10) -- 暂时允许NULL，后续更新为NOT NULL
);
GO

-- 1.4 车队表
CREATE TABLE Fleet (
    Fleet_ID VARCHAR(10) PRIMARY KEY,
    Fleet_Name VARCHAR(50) NOT NULL,
    DC_ID VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES DistributionCenter(DC_ID),
    Supervisor_ID VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Driver(Driver_ID),
    UNIQUE (Supervisor_ID) -- 1个主管仅负责1个车队（1:1关系）
);
GO

-- 1.5 补充司机表外键（关联车队表）
ALTER TABLE Driver
ADD FOREIGN KEY (Fleet_ID) REFERENCES Fleet(Fleet_ID);
GO

-- 1.6 车辆表
CREATE TABLE Vehicle (
    License_Plate VARCHAR(10) PRIMARY KEY,
    Max_Load DECIMAL(10,2) NOT NULL CHECK (Max_Load > 0),
    Max_Volume DECIMAL(10,2) NOT NULL CHECK (Max_Volume > 0),
    Current_Status VARCHAR(10) NOT NULL 
        CHECK (Current_Status IN ('空闲','运输中','维修中','异常')) 
        DEFAULT '空闲',
    Fleet_ID VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Fleet(Fleet_ID),
    Buy_Date DATE NOT NULL
);
GO

-- 1.7 运单表（Order为SQL Server关键字，加[]规避）
CREATE TABLE [Order] (
    Order_ID VARCHAR(20) PRIMARY KEY,
    Goods_Weight DECIMAL(10,2) NOT NULL CHECK (Goods_Weight > 0),
    Goods_Volume DECIMAL(10,2) NOT NULL CHECK (Goods_Volume > 0),
    Destination VARCHAR(100) NOT NULL,
    Create_Time DATETIME NOT NULL DEFAULT GETDATE(),
    License_Plate VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Vehicle(License_Plate),
    Transport_Status VARCHAR(10) NOT NULL 
        CHECK (Transport_Status IN ('待运输','装货中','运输中','已签收','异常')) 
        DEFAULT '待运输',
    Sign_Time DATETIME
);
GO

-- 1.8 异常事件表
CREATE TABLE AbnormalEvent (
    Event_ID VARCHAR(20) PRIMARY KEY,
    License_Plate VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Vehicle(License_Plate),
    Driver_ID VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Driver(Driver_ID),
    Occur_Time DATETIME NOT NULL DEFAULT GETDATE(),
    Event_Type VARCHAR(20) NOT NULL CHECK (Event_Type IN ('运输中异常','空闲时异常')),
    Description VARCHAR(200) NOT NULL,
    Fine_Amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (Fine_Amount >= 0),
    Handle_Status VARCHAR(10) NOT NULL 
        CHECK (Handle_Status IN ('已处理','未处理')) 
        DEFAULT '未处理',
    Handle_Time DATETIME
);
GO

-- 1.9 审计日志表（存储关键数据变更记录，无外键依赖）
CREATE TABLE History_Log (
    Log_ID INT IDENTITY(1,1) PRIMARY KEY, -- 自增主键，无需手动赋值
    Table_Name VARCHAR(50) NOT NULL, -- 被操作的表名（如Driver、AbnormalEvent）
    Field_Name VARCHAR(50) NOT NULL, -- 被修改的字段名（如License_Level、Handle_Status）
    Old_Value VARCHAR(100) NOT NULL, -- 字段修改前的旧值
    Operate_Time DATETIME NOT NULL DEFAULT GETDATE(), -- 操作时间，自动生成
    Operator VARCHAR(20) NOT NULL DEFAULT 'admin' -- 操作人，实验中默认admin即可
);
GO
-- ==================== 2.创建索引（优化高频查询） ====================
CREATE INDEX idx_Driver_Contact ON Driver(Contact); -- 司机联系方式快速查询
CREATE INDEX idx_Vehicle_Fleet ON Vehicle(Fleet_ID); -- 车队-车辆关联查询
CREATE INDEX idx_Order_CreateTime ON [Order](Create_Time); -- 运单按时间统计
CREATE INDEX idx_Event_HandleStatus ON AbnormalEvent(Handle_Status); -- 异常事件按处理状态查询
GO

-- ==================== 3.创建触发器 ====================
-- 3.1 运单超载校验触发器（插入前校验，避免车辆超载）
CREATE TRIGGER Trigger_Load_Check
ON [Order]
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON; -- 避免返回额外计数信息
    DECLARE @max_load DECIMAL(10,2), @current_total_weight DECIMAL(10,2), @license_plate VARCHAR(10);
    
    -- 获取插入的运单信息
    SELECT @license_plate = License_Plate, @current_total_weight = Goods_Weight FROM inserted;

    -- 锁定车辆记录（避免并发操作导致的超载问题）
    SELECT @max_load = Max_Load FROM Vehicle WITH (UPDLOCK) WHERE License_Plate = @license_plate;

    -- 计算当前车辆已分配未完成运单的总重量 + 新运单重量
    SELECT @current_total_weight = ISNULL(SUM(Goods_Weight), 0) + @current_total_weight
    FROM [Order] 
    WHERE License_Plate = @license_plate AND Transport_Status IN ('待运输','装货中','运输中');

    -- 超载则抛出异常
    IF @current_total_weight > @max_load
        THROW 50001, '超出车辆最大载重，运单分配失败', 1;

    -- 校验通过，插入运单并更新车辆状态为运输中
    INSERT INTO [Order] SELECT * FROM inserted;
    UPDATE Vehicle SET Current_Status = '运输中' WHERE License_Plate = @license_plate AND Current_Status = '空闲';
END
GO

-- 3.2 车辆状态自动流转触发器（运单签收后，车辆状态改为空闲）
CREATE TRIGGER Trigger_Vehicle_Status_Update
ON [Order]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    -- 仅当运单状态改为"已签收"时触发
    IF UPDATE(Transport_Status) AND (SELECT Transport_Status FROM inserted) = '已签收'
    BEGIN
        DECLARE @license_plate VARCHAR(10), @unfinish_count INT;
        SELECT @license_plate = License_Plate FROM inserted;

        -- 统计该车辆未完成的运单数量
        SELECT @unfinish_count = COUNT(*) 
        FROM [Order] 
        WHERE License_Plate = @license_plate AND Transport_Status IN ('待运输','装货中','运输中');

        -- 无未完成运单，车辆状态改为空闲
        IF @unfinish_count = 0
            UPDATE Vehicle SET Current_Status = '空闲' WHERE License_Plate = @license_plate;
    END
END
GO

-- 3.3 审计触发器：司机关键信息（驾照等级）修改记录
CREATE TRIGGER Trigger_Audit_Driver_License
ON Driver
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON; -- 避免返回额外计数信息，适配SQL Server语法

    -- 仅当驾照等级（License_Level）被修改时，才记录审计日志
    IF UPDATE(License_Level)
    BEGIN
        -- 从旧数据（deleted）和新数据（inserted）中获取变更信息
        INSERT INTO History_Log (Table_Name, Field_Name, Old_Value)
        SELECT 
            'Driver', -- 被操作的表名
            'License_Level', -- 被修改的字段名
            deleted.License_Level -- 字段旧值（修改前的驾照等级）
        FROM deleted
        JOIN inserted ON deleted.Driver_ID = inserted.Driver_ID;
        -- 关联deleted和inserted，确保只记录实际变更的司机数据
    END
END
GO

-- 3.4 审计触发器：异常事件处理状态变更记录
CREATE TRIGGER Trigger_Audit_Abnormal_Handle
ON AbnormalEvent
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- 仅当处理状态（Handle_Status）从未处理改为已处理时，记录审计日志
    IF UPDATE(Handle_Status)
    BEGIN
        INSERT INTO History_Log (Table_Name, Field_Name, Old_Value)
        SELECT 
            'AbnormalEvent', -- 被操作的表名
            'Handle_Status', -- 被修改的字段名
            deleted.Handle_Status -- 字段旧值（默认是“未处理”）
        FROM deleted
        JOIN inserted ON deleted.Event_ID = inserted.Event_ID
        WHERE deleted.Handle_Status = '未处理' AND inserted.Handle_Status = '已处理';
        -- 精准过滤：只记录“未处理→已处理”的变更，符合实验要求
    END
END
GO

-- ==================== 4.创建存储过程 ====================
-- 4.1 车队月度报表存储过程（统计指定车队指定月份的运单/异常数据）
CREATE PROCEDURE SP_Fleet_Monthly_Report
    @in_fleet_id VARCHAR(10), -- 车队编号
    @in_year INT, -- 年份
    @in_month INT, -- 月份
    @out_total_orders INT OUTPUT, -- 输出：总运单数
    @out_total_events INT OUTPUT, -- 输出：总异常数
    @out_total_fines DECIMAL(10,2) OUTPUT -- 输出：总罚款金额
AS
BEGIN
    SET NOCOUNT ON;
    -- 统计总运单数
    SELECT @out_total_orders = COUNT(*) 
    FROM [Order] o
    JOIN Vehicle v ON o.License_Plate = v.License_Plate
    WHERE v.Fleet_ID = @in_fleet_id AND YEAR(o.Create_Time) = @in_year AND MONTH(o.Create_Time) = @in_month;

    -- 统计总异常数 + 总罚款金额
    SELECT @out_total_events = COUNT(*), @out_total_fines = ISNULL(SUM(Fine_Amount), 0)
    FROM AbnormalEvent ae
    JOIN Vehicle v ON ae.License_Plate = v.License_Plate
    WHERE v.Fleet_ID = @in_fleet_id AND YEAR(ae.Occur_Time) = @in_year AND MONTH(ae.Occur_Time) = @in_month;
END
GO

-- ==================== 5.创建视图 ====================
-- 5.1 车队异常警报视图（展示近7天未处理的异常事件）
CREATE VIEW View_Fleet_Abnormal_Alert
AS
SELECT 
    v.License_Plate AS 车牌,
    f.Fleet_Name AS 车队名称,
    d.Driver_Name AS 司机姓名,
    ae.Event_Type AS 异常类型,
    ae.Occur_Time AS 异常发生时间,
    ae.Description AS 异常描述
FROM AbnormalEvent ae
JOIN Vehicle v ON ae.License_Plate = v.License_Plate
JOIN Fleet f ON v.Fleet_ID = f.Fleet_ID
JOIN Driver d ON ae.Driver_ID = d.Driver_ID
WHERE ae.Handle_Status = '未处理' AND ae.Occur_Time >= DATEADD(DAY, -7, GETDATE());
GO

-- ==================== 6.测试数据 ====================
-- 6.1 插主表：配送中心（无外键）
INSERT INTO DistributionCenter VALUES ('DC001', '华东配送中心', '华东', '上海市浦东新区XX路100号', '13800138000');
GO

-- 6.2 插司机（先插主管，Fleet_ID暂时留空）
INSERT INTO Driver (Driver_ID, Driver_Name, License_Level, Contact, Hire_Date)
VALUES ('D001', '张三', 'A', '13900139000', '2020-01-01');
GO

-- 6.3 插车队（此时Driver表已有D001，可关联Supervisor_ID）
INSERT INTO Fleet VALUES ('F001', '华东配送车队', 'DC001', 'D001');
GO

-- 6.4 补全司机表的Fleet_ID（解决循环依赖）
UPDATE Driver SET Fleet_ID = 'F001' WHERE Driver_ID = 'D001';
GO

-- 6.5 把Driver表的Fleet_ID改回NOT NULL（恢复原设计要求）
ALTER TABLE Driver
ALTER COLUMN Fleet_ID VARCHAR(10) NOT NULL;
GO

-- 6.6 插普通司机（此时Fleet表已有F001，可正常关联）
INSERT INTO Driver VALUES ('D002', '李四', 'B', '13700137000', '2021-02-01', 'F001');
GO

-- 6.7 插车辆（Fleet表已有F001，可关联）
INSERT INTO Vehicle VALUES ('沪A12345', 5.0, 10.0, '空闲', 'F001', '2022-03-01');
GO

-- 6.8 插运单（车辆表已有沪A12345，可关联）
INSERT INTO [Order] (Order_ID, Goods_Weight, Goods_Volume, Destination, License_Plate)
VALUES ('ORD202512001', 2.0, 3.0, '南京市玄武区XX路', '沪A12345');
GO

-- 6.9 验证超载触发器（插入4吨运单，累计6吨>5吨，会抛出异常）
-- 执行以下语句会报错：超出车辆最大载重，运单分配失败（验证触发器生效）
-- INSERT INTO [Order] (Order_ID, Goods_Weight, Goods_Volume, Destination, License_Plate)
-- VALUES ('ORD202512002', 4.0, 5.0, '杭州市西湖区XX路', '沪A12345');
-- GO

-- 6.10 验证车辆状态流转（将运单改为已签收，车辆状态变回空闲）
UPDATE [Order] SET Transport_Status = '已签收', Sign_Time = GETDATE() WHERE Order_ID = 'ORD202512001';
GO

-- 6.11 插异常事件（车辆、司机表都有对应数据，可关联）
INSERT INTO AbnormalEvent (Event_ID, License_Plate, Driver_ID, Event_Type, Description, Fine_Amount)
VALUES ('EV202512001', '沪A12345', 'D002', '运输中异常', '货物轻微破损', 200.0);
GO

-- 6.12 调用存储过程测试（查询F001车队2025年12月数据）
DECLARE @total_orders INT, @total_events INT, @total_fines DECIMAL(10,2);
EXEC SP_Fleet_Monthly_Report 'F001', 2025, 12, @total_orders OUTPUT, @total_events OUTPUT, @total_fines OUTPUT;
SELECT @total_orders AS 总运单数, @total_events AS 总异常数, @total_fines AS 总罚款金额;
GO