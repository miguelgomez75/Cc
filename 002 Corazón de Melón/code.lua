incrementy = y+5

if z == 0 then
  if abs(y-1) < 2 then
    if y == 2 and (abs(x) == 4 or x == 0) then
      return 10
    elseif (x == -2 and y == 0) or (x==3 and y == 1) then
      return 3
    else
      return 7
    end
  elseif x ~= 0 and abs(x) < 4 and y == 3 then
    return 10
  elseif y < 0 and incrementy > abs(x) then
    if (x == 1 and y == -1) or (x == -1 and y == -2) then
      return 3
    else
      return 7
    end
  end 
 end
