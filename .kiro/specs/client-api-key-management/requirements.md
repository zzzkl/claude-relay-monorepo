# Requirements Document

## Introduction

本文档定义了客户端 API Key 管理功能的需求。该功能允许管理员在管理中心页面生成、查看、管理和撤销客户端访问系统时使用的 API Key。这些 API Key 用于客户端认证，不同于供应商 API Key。

## Requirements

### Requirement 1

**User Story:** 作为系统管理员，我希望能够生成新的客户端 API Key，以便为新的客户端应用提供访问权限。

#### Acceptance Criteria

1. WHEN 管理员点击"生成 API Key"按钮 THEN 系统应生成一个唯一的 API Key
2. WHEN API Key 生成成功 THEN 系统应显示完整的 API Key 给管理员
3. WHEN API Key 生成 THEN 系统应自动设置创建时间和默认有效期
4. WHEN 生成 API Key THEN 系统应允许管理员设置可选的描述信息

### Requirement 2

**User Story:** 作为系统管理员，我希望能够查看所有客户端 API Key 的列表，以便监控和管理现有的访问凭证。

#### Acceptance Criteria

1. WHEN 管理员访问 API Key 管理页面 THEN 系统应显示所有 API Key 的列表
2. WHEN 显示 API Key 列表 THEN 系统应显示每个 Key 的部分信息（前几位和后几位，中间用星号隐藏）
3. WHEN 显示 API Key 列表 THEN 系统应显示创建时间、最后使用时间、状态和描述
4. WHEN API Key 列表为空 THEN 系统应显示友好的空状态提示

### Requirement 3

**User Story:** 作为系统管理员，我希望能够查看单个 API Key 的详细信息，以便了解其使用情况和配置。

#### Acceptance Criteria

1. WHEN 管理员点击某个 API Key THEN 系统应显示该 Key 的详细信息页面
2. WHEN 显示详细信息 THEN 系统应包含创建时间、最后使用时间、使用次数、状态等信息
3. WHEN 显示详细信息 THEN 系统应提供复制 API Key 的功能
4. WHEN 显示详细信息 THEN 系统应显示该 Key 的使用统计图表

### Requirement 4

**User Story:** 作为系统管理员，我希望能够禁用或启用 API Key，以便控制客户端的访问权限。

#### Acceptance Criteria

1. WHEN 管理员点击"禁用"按钮 THEN 系统应将 API Key 状态设置为禁用
2. WHEN API Key 被禁用 THEN 使用该 Key 的请求应返回认证失败错误
3. WHEN 管理员点击"启用"按钮 THEN 系统应将 API Key 状态设置为启用
4. WHEN API Key 状态改变 THEN 系统应记录状态变更的时间和操作者

### Requirement 5

**User Story:** 作为系统管理员，我希望能够删除不再需要的 API Key，以便保持系统的安全性和整洁性。

#### Acceptance Criteria

1. WHEN 管理员点击"删除"按钮 THEN 系统应显示确认对话框
2. WHEN 管理员确认删除 THEN 系统应永久删除该 API Key
3. WHEN API Key 被删除 THEN 使用该 Key 的请求应返回认证失败错误
4. WHEN API Key 被删除 THEN 系统应从列表中移除该记录

### Requirement 6

**User Story:** 作为系统管理员，我希望能够编辑 API Key 的描述信息，以便更好地识别和管理不同的客户端。

#### Acceptance Criteria

1. WHEN 管理员点击"编辑"按钮 THEN 系统应显示可编辑的描述字段
2. WHEN 管理员保存修改 THEN 系统应更新 API Key 的描述信息
3. WHEN 描述信息过长 THEN 系统应限制描述的最大长度
4. WHEN 保存成功 THEN 系统应显示成功提示消息

### Requirement 7

**User Story:** 作为客户端开发者，我希望使用 API Key 访问系统时能够得到正确的认证和授权，以便正常使用 Claude Relay 服务。

#### Acceptance Criteria

1. WHEN 客户端在请求头中提供有效的 API Key THEN 系统应验证并允许访问
2. WHEN 客户端提供无效的 API Key THEN 系统应返回 401 认证失败错误
3. WHEN 客户端提供已禁用的 API Key THEN 系统应返回 403 禁止访问错误
4. WHEN 客户端成功使用 API Key THEN 系统应记录该 Key 的最后使用时间

### Requirement 8

**User Story:** 作为系统管理员，我希望能够查看 API Key 的使用统计，以便了解系统的使用情况和优化资源分配。

#### Acceptance Criteria

1. WHEN 管理员查看 API Key 详情 THEN 系统应显示该 Key 的使用次数统计
2. WHEN 显示使用统计 THEN 系统应包含按时间段的使用频率图表
3. WHEN 显示使用统计 THEN 系统应包含最近的请求记录
4. WHEN 统计数据更新 THEN 系统应实时或准实时地更新显示