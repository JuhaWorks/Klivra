import sys

path = 'c:/Users/asus/CSE 471 Project/backend/controllers/user.controller.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if 'module.exports = {' in line:
        start = i
        break

if start != -1:
    new_lines = lines[:start]
    new_lines.extend([
        "const subscribeToPush = catchAsync(async (req, res) => {\n",
        "    const { subscription, userAgent } = req.body;\n",
        "    \n",
        "    if (!subscription || !subscription.endpoint || !subscription.keys) {\n",
        "        res.status(400);\n",
        "        throw new Error('Invalid subscription object');\n",
        "    }\n",
        "\n",
        "    const user = await User.findById(req.user._id);\n",
        "\n",
        "    // Check if subscription already exists for this user\n",
        "    const exists = user.pushSubscriptions.find(s => s.endpoint === subscription.endpoint);\n",
        "    if (!exists) {\n",
        "        user.pushSubscriptions.push({\n",
        "            ...subscription,\n",
        "            userAgent: userAgent || 'Unknown'\n",
        "        });\n",
        "        await user.save();\n",
        "    }\n",
        "\n",
        "    res.status(200).json({ status: 'success', message: 'Successfully subscribed to push notifications' });\n",
        "});\n",
        "\n",
        "const unsubscribeFromPush = catchAsync(async (req, res) => {\n",
        "    const { endpoint } = req.body;\n",
        "    \n",
        "    const user = await User.findById(req.user._id);\n",
        "    user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== endpoint);\n",
        "    await user.save();\n",
        "\n",
        "    res.status(200).json({ status: 'success', message: 'Successfully unsubscribed from push notifications' });\n",
        "});\n",
        "\n",
        "module.exports = {\n",
        "    uploadAvatar,\n",
        "    uploadCoverImage,\n",
        "    updateProfile,\n",
        "    changePassword,\n",
        "    removeAvatar,\n",
        "    requestEmailChangeOTP,\n",
        "    verifyEmailChangeOTP,\n",
        "    confirmEmailChange,\n",
        "    getPublicProfile,\n",
        "    getHeatmap,\n",
        "    getWorkspaceMembers,\n",
        "    deactivateAccount,\n",
        "    deleteAccount,\n",
        "    getNotifications,\n",
        "    markAsRead,\n",
        "    markAllAsRead,\n",
        "    archiveNotification,\n",
        "    archiveAll,\n",
        "    deleteNotification,\n",
        "    updateNotificationPreferences,\n",
        "    sendTestNotification,\n",
        "    updateSecurity,\n",
        "    subscribeToPush,\n",
        "    unsubscribeFromPush\n",
        "};\n"
    ])
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully fixed user.controller.js")
else:
    print("Could not find module.exports in user.controller.js")
